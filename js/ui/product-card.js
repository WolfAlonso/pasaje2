// =============================================================
// /js/ui/product-card.js
// Renderizador UI de Tarjetas con Insignia de Tienda Verificada, Ofertas Relámpago y Estrellas
// =============================================================

(function () {
  'use strict';

  function escapeHtml(str) {
    if (window.dashEscapeHtml) return window.dashEscapeHtml(str);
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildWAUrl(p, selectedVariant = null, calculatedPrice = null) {
    const cleanPhone = window.cleanPhone || (raw => String(raw || '').replace(/\D/g, ''));
    const phone = cleanPhone(p.store_whatsapp);
    const finalPrice = calculatedPrice !== null ? calculatedPrice : parseFloat(p.price || 0);
    const priceStr = finalPrice.toFixed(2);
    
    let variantText = '';
    if (selectedVariant) {
      variantText = ` (Opción: ${selectedVariant.name})`;
    }

    const msg = encodeURIComponent(`Hola, vi tu producto *${p.title}*${variantText} (Q ${priceStr}) en Pasaje de los Altos y me interesa.`);
    return `https://wa.me/${phone}?text=${msg}`;
  }

  function getStockStatus(p) {
    if (!p.is_active) return { key: 'inactive', label: '⛔ Agotado', style: 'bg-slate-200 text-slate-800' };
    if (p.stock_quantity === null || p.stock_quantity === undefined) return { key: 'unlimited', label: '♾️ Disponible', style: 'bg-emerald-50 text-emerald-800' };
    if (p.stock_quantity === 0) return { key: 'out', label: '⛔ Agotado', style: 'bg-rose-100 text-rose-800' };
    if (p.stock_quantity <= 3) return { key: 'low', label: `⚡ Quedan ${p.stock_quantity}`, style: 'bg-amber-100 text-amber-900' };
    return { key: 'in', label: `📦 Stock: ${p.stock_quantity}`, style: 'bg-emerald-100 text-emerald-800' };
  }

  function renderStars(rating = 5) {
    const fullStars = Math.floor(rating);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        starsHtml += '<span class="text-amber-400">★</span>';
      } else {
        starsHtml += '<span class="text-slate-200">★</span>';
      }
    }
    return `<span class="inline-flex items-center text-xs tracking-tight">${starsHtml}</span>`;
  }

  function renderCardHTML(p, options = {}) {
    const placeholder = window.PLACEHOLDER_IMG || 'img/placeholder.png';
    const img = p.image_url || placeholder;
    const isFav = window.Favorites ? window.Favorites.has(p.id) : false;
    const isOutOfStock = !p.is_active || p.stock_quantity === 0;
    const waUrl = buildWAUrl(p);
    const heartSvg = window.heartSVG ? window.heartSVG(isFav) : '❤️';
    const isFeaturedView = !!options.isFeatured;
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const hasGallery = Array.isArray(p.images) && p.images.length > 1;

    // Lógica de Oferta Relámpago en Tarjeta
    const isOnSale = p.is_on_sale && (!p.sale_expires_at || new Date(p.sale_expires_at) > new Date());
    const origPrice = isOnSale ? parseFloat(p.original_price || p.price * 1.25) : null;
    const discountPct = origPrice && origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 20;

    const saleBadge = isOnSale 
      ? `<span class="absolute top-2 left-2 z-10 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">-${discountPct}% OFF</span>` 
      : '';

    const priceDisplay = isOnSale
      ? `<div class="flex items-baseline gap-1.5"><span class="text-xs font-bold text-slate-400 line-through">Q ${origPrice.toFixed(2)}</span><span class="product-price text-rose-600 font-black">Q ${parseFloat(p.price).toFixed(2)}</span></div>`
      : `<span class="product-price text-emerald-600">Q ${parseFloat(p.price).toFixed(2)}</span>`;

    const verifiedBadge = p.store_is_verified 
      ? `<span class="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" title="Tienda Verificada">✓ Verificada</span>`
      : '';

    const storeLine = p.store_slug
      ? `<a href="tienda.html?slug=${p.store_slug}" data-action="store-link" class="store-badge product-store no-click hover:underline flex items-center gap-1.5">
           <span>🏪 ${escapeHtml(p.store_name)}</span>
           ${verifiedBadge}
         </a>`
      : `<span class="store-badge product-store flex items-center gap-1.5">
           <span>🏪 ${escapeHtml(p.store_name)}</span>
           ${verifiedBadge}
         </span>`;

    const featuresBadges = `
      ${hasGallery ? `<span class="text-[9px] bg-slate-800/70 backdrop-blur text-white font-bold px-1.5 py-0.5 rounded-md">📷 Galería</span>` : ''}
      ${hasVariants ? `<span class="text-[9px] bg-indigo-800/70 backdrop-blur text-white font-bold px-1.5 py-0.5 rounded-md">🎨 Opciones</span>` : ''}
    `;

    if (isFeaturedView) {
      return `
        <article class="product-card glass-card-product snap-start flex-shrink-0 w-64 overflow-hidden flex flex-col border border-amber-200/80 shadow-sm ${isOutOfStock ? 'opacity-70' : ''}"
                 data-product-id="${p.id}" data-action="open-modal">
          <div class="aspect-video bg-slate-100 overflow-hidden relative">
            <img src="${img}" alt="${escapeHtml(p.title)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${placeholder}'"
                 class="w-full h-full object-cover">
            ${saleBadge}
            <span class="absolute top-2 right-12 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shadow-sm pointer-events-none">⭐ Destacado</span>
            <div class="absolute bottom-2 left-2 flex gap-1 pointer-events-none">
              ${featuresBadges}
            </div>
            <button type="button" data-action="toggle-fav" data-product-id="${p.id}"
              class="fav-btn no-click absolute top-2 right-2 bg-white/90 hover:bg-white w-7 h-7 rounded-full shadow flex items-center justify-center transition ${isFav ? 'fav-active' : ''}"
              style="${isFav ? 'color:#ef4444;' : ''}">
              ${heartSvg}
            </button>
          </div>
          <div class="p-3 flex-1 flex flex-col">
            <h3 class="product-title line-clamp-2">${escapeHtml(p.title)}</h3>
            <div class="mt-1">${storeLine}</div>
            <div class="mt-auto pt-2 flex items-center justify-between gap-2">
              ${priceDisplay}
              ${isOutOfStock
                ? `<button disabled class="bg-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl cursor-not-allowed no-click">Agotado</button>`
                : `<div class="flex gap-1">
                     <button type="button" data-action="add-cart" data-product-id="${p.id}"
                       class="no-click bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1.5 rounded-xl transition hover:bg-emerald-200"
                       title="Añadir">🛒</button>
                     <a href="${waUrl}" target="_blank" rel="noopener noreferrer"
                        data-action="order-wa" data-product-id="${p.id}" data-wa-source="index-destacado"
                        class="wa-order-btn no-click bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm hover:bg-[#128C7E]">Pedir</a>
                   </div>`}
            </div>
          </div>
        </article>`;
    }

    return `
      <article class="product-card glass-card-product overflow-hidden flex flex-col relative transition duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isOutOfStock ? 'opacity-70' : ''}"
               data-product-id="${p.id}" data-action="open-modal">
        <button type="button" data-action="toggle-fav" data-product-id="${p.id}"
          class="fav-btn no-click absolute top-2 right-2 z-10 bg-white/90 hover:bg-white w-7 h-7 rounded-full shadow flex items-center justify-center transition ${isFav ? 'fav-active' : ''}"
          style="${isFav ? 'color:#ef4444;' : ''}">
          ${heartSvg}
        </button>
        <div class="aspect-square bg-slate-100 overflow-hidden relative pointer-events-none">
          <img src="${img}" alt="${escapeHtml(p.title)}" loading="lazy"
               onerror="this.onerror=null;this.src='${placeholder}'"
               class="w-full h-full object-cover">
          ${saleBadge}
          <div class="absolute bottom-2 left-2 flex gap-1 pointer-events-none">
            ${featuresBadges}
          </div>
          ${isOutOfStock ? `<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-white text-rose-700 font-extrabold text-xs px-3 py-1 rounded-full shadow">⛔ AGOTADO</span></div>` : ''}
        </div>
        <div class="p-3.5 flex-1 flex flex-col">
          <span class="text-[10px] uppercase font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded self-start">
            ${p.category_icon || '📦'} ${escapeHtml(p.category_name || 'General')}
          </span>

          <h3 class="product-title mt-1.5 line-clamp-2">${escapeHtml(p.title)}</h3>
          <div class="mt-1">${storeLine}</div>

          <div class="mt-auto pt-3 flex items-center justify-between gap-2">
            ${priceDisplay}
            ${isOutOfStock
              ? `<button disabled class="bg-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl cursor-not-allowed no-click">Agotado</button>`
              : `<div class="flex gap-1">
                   <button type="button" data-action="add-cart" data-product-id="${p.id}"
                     class="no-click bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                     title="Añadir al carrito">🛒</button>
                   <a href="${waUrl}" target="_blank" rel="noopener noreferrer"
                      data-action="order-wa" data-product-id="${p.id}" data-wa-source="index"
                      class="wa-order-btn no-click bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm">Pedir</a>
                 </div>`}
          </div>
        </div>
      </article>`;
  }

  function renderGalleryHTML(images, title) {
    const placeholder = window.PLACEHOLDER_IMG || 'img/placeholder.png';
    const imgs = Array.isArray(images) && images.length > 0 ? images : [placeholder];
    const mainImg = imgs[0];

    return `
      <div class="product-gallery space-y-2">
        <div class="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200/80 shadow-inner">
          <img id="mainGalleryViewer" src="${mainImg}" alt="${escapeHtml(title)}"
               onerror="this.onerror=null;this.src='${placeholder}'"
               class="w-full h-full object-cover transition duration-300">
        </div>
        ${imgs.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
            ${imgs.map((url, idx) => `
              <button type="button" data-gallery-thumb="${url}"
                class="gallery-thumb snap-start flex-shrink-0 w-14 h-14 rounded-xl border-2 overflow-hidden transition ${idx === 0 ? 'border-emerald-500 scale-95 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}">
                <img src="${url}" alt="miniatura" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='${placeholder}'">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>`;
  }

  function renderVariantsHTML(variants) {
    if (!Array.isArray(variants) || variants.length === 0) return '';

    const groups = {};
    variants.forEach(v => {
      const gName = v.group || 'Opción';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(v);
    });

    return `
      <div class="product-variants-container space-y-3 mt-4 pt-3 border-t border-slate-100">
        ${Object.keys(groups).map((groupName, gIdx) => {
          const items = groups[groupName];
          return `
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">${escapeHtml(groupName)} *</label>
              <div class="flex flex-wrap gap-2">
                ${items.map((item, iIdx) => {
                  const isSelected = iIdx === 0 && gIdx === 0;
                  const adj = item.price_adjustment;
                  let adjText = '';
                  if (adj > 0) adjText = ` (+Q${adj.toFixed(2)})`;
                  else if (adj < 0) adjText = ` (-Q${Math.abs(adj).toFixed(2)})`;

                  const isOut = item.stock_quantity !== null && item.stock_quantity <= 0;

                  return `
                    <button type="button"
                      data-variant-id="${item.id}"
                      data-variant-name="${escapeHtml(item.name)}"
                      data-variant-adjustment="${adj}"
                      data-variant-stock="${item.stock_quantity !== null ? item.stock_quantity : ''}"
                      ${isOut ? 'disabled' : ''}
                      class="variant-btn text-xs font-semibold px-3 py-2 rounded-xl border transition flex items-center gap-1 ${
                        isOut 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                          : (isSelected 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50')
                      }">
                      <span>${escapeHtml(item.name)}</span>
                      <span class="text-[10px] opacity-80">${adjText}</span>
                    </button>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  window.ProductCardUI = {
    render: renderCardHTML,
    renderGalleryHTML,
    renderVariantsHTML,
    renderStars,
    escapeHtml,
    buildWAUrl,
    getStockStatus
  };
})();