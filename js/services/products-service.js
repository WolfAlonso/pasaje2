// =============================================================
// /js/services/products-service.js
// Servicio de consulta de productos, verificación de tiendas y ofertas relámpago
// =============================================================

(function () {
  'use strict';

  const PAGE_SIZE = 12;

  function normalizeProduct(p) {
    if (!p) return null;
    const s = p.stores || {};
    const c = p.categories || {};

    let gallery = [];
    if (Array.isArray(p.product_images) && p.product_images.length > 0) {
      gallery = p.product_images
        .slice()
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(img => img.image_url)
        .filter(Boolean);
    }

    const mainImg = p.image_url || null;
    const allImages = [];
    if (mainImg) allImages.push(mainImg);
    gallery.forEach(url => {
      if (url && !allImages.includes(url)) allImages.push(url);
    });

    let variants = [];
    if (Array.isArray(p.product_variants)) {
      variants = p.product_variants.map(v => ({
        id: v.id,
        group: v.variant_group || 'Opción',
        name: v.name || '',
        price_adjustment: parseFloat(v.price_adjustment || 0),
        stock_quantity: (v.stock_quantity === null || v.stock_quantity === undefined) ? null : parseInt(v.stock_quantity, 10)
      }));
    }

    return {
      id: p.id,
      title: p.title || '',
      description: p.description || '',
      price: parseFloat(p.price || 0),
      original_price: p.original_price !== null && p.original_price !== undefined ? parseFloat(p.original_price) : null,
      is_on_sale: !!p.is_on_sale,
      sale_expires_at: p.sale_expires_at || null,
      image_url: mainImg,
      images: allImages.length > 0 ? allImages : (mainImg ? [mainImg] : []),
      variants: variants,
      is_featured: !!p.is_featured,
      is_active: p.is_active !== false,
      stock_quantity: (p.stock_quantity === null || p.stock_quantity === undefined) ? null : parseInt(p.stock_quantity, 10),
      badge_tag: p.badge_tag || null,
      prep_time: p.prep_time || null,
      min_order_qty: p.min_order_qty || 1,
      favorites_count: p.favorites_count || 0,
      store_id: s.id || p.store_id || null,
      store_name: s.name || 'Tienda local',
      store_slug: s.slug || null,
      store_whatsapp: s.whatsapp || '',
      store_address: s.address || null,
      store_logo: s.logo_url || null,
      store_is_active: s.is_active !== false,
      store_is_suspended: !!s.is_suspended,
      store_is_verified: !!s.is_verified,
      category_id: c.id || p.category_id || null,
      category_name: c.name || 'General',
      category_slug: c.slug || 'otros',
      category_icon: c.icon || '📦',
      created_at: p.created_at
    };
  }

  async function fetchProducts({
    page = 0,
    limit = PAGE_SIZE,
    categorySlug = 'todas',
    searchTerm = '',
    sortBy = 'recent',
    minPrice = null,
    maxPrice = null
  } = {}) {
    if (typeof window._supabase === 'undefined') {
      throw new Error('Supabase no está inicializado.');
    }

    const from = page * limit;
    const to = from + limit - 1;

    let selectQuery = `
      id, title, description, price, original_price, is_on_sale, sale_expires_at, image_url, is_featured, is_active,
      stock_quantity, badge_tag, prep_time, min_order_qty, favorites_count,
      store_id, category_id, created_at,
      stores!inner ( id, name, whatsapp, slug, address, logo_url, is_active, is_suspended, is_verified ),
      categories ( id, name, slug, icon ),
      product_images ( id, image_url, sort_order ),
      product_variants ( id, variant_group, name, price_adjustment, stock_quantity )
    `;

    if (categorySlug && categorySlug !== 'todas') {
      selectQuery = `
        id, title, description, price, original_price, is_on_sale, sale_expires_at, image_url, is_featured, is_active,
        stock_quantity, badge_tag, prep_time, min_order_qty, favorites_count,
        store_id, category_id, created_at,
        stores!inner ( id, name, whatsapp, slug, address, logo_url, is_active, is_suspended, is_verified ),
        categories!inner ( id, name, slug, icon ),
        product_images ( id, image_url, sort_order ),
        product_variants ( id, variant_group, name, price_adjustment, stock_quantity )
      `;
    }

    let query = window._supabase
      .from('products')
      .select(selectQuery, { count: 'exact' })
      .eq('is_active', true)
      .eq('stores.is_active', true)
      .eq('stores.is_suspended', false);

    if (categorySlug && categorySlug !== 'todas') {
      query = query.eq('categories.slug', categorySlug);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim();
      query = query.ilike('title', `%${term}%`);
    }

    if (minPrice !== null && minPrice !== undefined && minPrice !== '' && !isNaN(minPrice)) {
      query = query.gte('price', parseFloat(minPrice));
    }

    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '' && !isNaN(maxPrice)) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    switch (sortBy) {
      case 'popular':
        query = query.order('favorites_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'price-asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('price', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('[ProductsService] Error en consulta de catálogo:', error);
      throw error;
    }

    const products = (data || [])
      .map(normalizeProduct)
      .filter(p => p && p.store_is_active && !p.store_is_suspended);

    const totalCount = count || 0;
    const hasMore = (from + products.length) < totalCount;

    return { products, hasMore, totalCount, page, limit };
  }

  async function searchPredictive(term, limit = 6) {
    if (typeof window._supabase === 'undefined') return [];
    if (!term || term.trim().length < 2) return [];

    const cleanTerm = term.trim();

    const { data, error } = await window._supabase
      .from('products')
      .select(`
        id, title, description, price, original_price, is_on_sale, sale_expires_at, image_url, is_featured, is_active,
        stock_quantity, badge_tag, prep_time, min_order_qty, favorites_count,
        store_id, category_id, created_at,
        stores!inner ( id, name, whatsapp, slug, address, logo_url, is_active, is_suspended, is_verified ),
        categories ( id, name, slug, icon ),
        product_images ( id, image_url, sort_order ),
        product_variants ( id, variant_group, name, price_adjustment, stock_quantity )
      `)
      .eq('is_active', true)
      .eq('stores.is_active', true)
      .eq('stores.is_suspended', false)
      .ilike('title', `%${cleanTerm}%`)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProductsService] Error en búsqueda predictiva:', error);
      return [];
    }

    return (data || [])
      .map(normalizeProduct)
      .filter(p => p && p.store_is_active && !p.store_is_suspended);
  }

  async function fetchFeaturedProducts(limit = 10) {
    if (typeof window._supabase === 'undefined') return [];

    const { data, error } = await window._supabase
      .from('products')
      .select(`
        id, title, description, price, original_price, is_on_sale, sale_expires_at, image_url, is_featured, is_active,
        stock_quantity, badge_tag, prep_time, min_order_qty, favorites_count,
        store_id, category_id, created_at,
        stores!inner ( id, name, whatsapp, slug, address, logo_url, is_active, is_suspended, is_verified ),
        categories ( id, name, slug, icon ),
        product_images ( id, image_url, sort_order ),
        product_variants ( id, variant_group, name, price_adjustment, stock_quantity )
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .eq('stores.is_active', true)
      .eq('stores.is_suspended', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProductsService] Error al obtener destacados:', error);
      return [];
    }

    return (data || []).map(normalizeProduct);
  }

  async function fetchProductReviews(productId) {
    if (typeof window._supabase === 'undefined' || !productId) return [];
    const { data, error } = await window._supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async function fetchStoreReviews(storeId) {
    if (typeof window._supabase === 'undefined' || !storeId) return [];
    const { data, error } = await window._supabase
      .from('reviews')
      .select(`*, products ( id, title )`)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async function addReview({ storeId, productId, rating, comment, customerName }) {
    if (typeof window._supabase === 'undefined') throw new Error('Supabase no disponible');
    const { data, error } = await window._supabase
      .from('reviews')
      .insert([{
        store_id: storeId,
        product_id: productId,
        rating: parseInt(rating, 10),
        comment: comment ? comment.trim() : null,
        customer_name: customerName ? customerName.trim() : 'Cliente Anónimo'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  window.ProductsService = {
    PAGE_SIZE,
    getProducts: fetchProducts,
    searchPredictive,
    getFeaturedProducts: fetchFeaturedProducts,
    fetchProductReviews,
    fetchStoreReviews,
    addReview,
    normalizeProduct
  };
})();