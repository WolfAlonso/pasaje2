// js/supabase.js
const SUPABASE_URL = 'https://wdhfsagzjkdjtwdjbgkp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkaGZzYWd6amtkanR3ZGpiZ2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDU1ODAsImV4cCI6MjEwNTMyMTU4MH0.cpFNV8vKmKsHp1qMXFWw-lnDMICXJgfnCAgJ3ZBTiuQ';

window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------
// Helpers generales
// ---------------------------------------------------------------
window.handleSupabaseError = (error, contexto = 'Operación') => {
  console.error(`[${contexto}]`, error);
  alert(`${contexto}: ${error?.message || error}`);
};

window.requireAuth = async () => {
  const { data: { session } } = await window._supabase.auth.getSession();
  if (!session) { window.location.replace('login.html'); return null; }
  return session;
};

window.redirectIfAuthenticated = async () => {
  const { data: { session } } = await window._supabase.auth.getSession();
  if (session) window.location.replace('dashboard.html');
};

window.cleanPhone = (phone) => (phone || '').replace(/\D/g, '');
window.PLACEHOLDER_IMG = 'img/placeholder.png';

// ---------------------------------------------------------------
// Storage
// ---------------------------------------------------------------
window.uploadImage = async (file, bucket, userId) => {
  if (!file) return null;
  const MAX_MB = bucket === 'logos' ? 2 : 5;
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`La imagen excede ${MAX_MB} MB.`);
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await _supabase.storage
    .from(bucket).upload(filename, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  const { data: { publicUrl } } = _supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
};

window.deleteImageByUrl = async (url, bucket) => {
  if (!url) return;
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.substring(idx + marker.length));
    await _supabase.storage.from(bucket).remove([path]);
  } catch (e) { console.warn('[Storage] No se pudo borrar imagen:', e); }
};

// ---------------------------------------------------------------
// E) FAVORITOS (localStorage)
// ---------------------------------------------------------------
window.Favorites = {
  KEY: 'pasaje_favoritos_v1',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },
  has(id) { return this.getAll().includes(id); },
  toggle(id) {
    const list = this.getAll();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(id);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    return this.has(id);
  },
  count() { return this.getAll().length; },
  clear() { localStorage.removeItem(this.KEY); }
};

// ---------------------------------------------------------------
// D) ADMIN
// ---------------------------------------------------------------
window.isAdmin = async () => {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return false;
  const { data, error } = await _supabase
    .from('user_roles').select('is_admin').eq('user_id', session.user.id).maybeSingle();
  if (error) return false;
  return data?.is_admin === true;
};

// ---------------------------------------------------------------
// A) Ícono corazón reutilizable
// ---------------------------------------------------------------
window.heartSVG = (filled = false) => filled
  ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
  : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

// Corrige meta tag deprecado (llamada automática)
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
    const m = document.createElement('meta');
    m.name = 'mobile-web-app-capable';
    m.content = 'yes';
    document.head.appendChild(m);
  }
});

// ---------------------------------------------------------------
// Tracking: clics a WhatsApp
// ---------------------------------------------------------------
window.logWhatsAppClick = function (productId, storeId, sourcePage) {
  if (!productId || !storeId) return;
  // Fire-and-forget: no bloquea la apertura de WhatsApp
  _supabase
    .from('whatsapp_clicks')
    .insert([{
      product_id: productId,
      store_id: storeId,
      source_page: sourcePage || 'unknown'
    }])
    .then(() => {})
    .catch((err) => console.warn('[Tracking] clic no registrado:', err?.message));
};

// ---------------------------------------------------------------
// Tracking: favoritos (incrementa/decrementa en BD)
// ---------------------------------------------------------------
window.toggleFavoriteWithCount = function (productId) {
  const nowFav = Favorites.toggle(productId);
  if (nowFav) {
    _supabase.rpc('increment_favorites', { product_uuid: productId })
      .then(() => {}).catch((err) => console.warn('[Fav++]', err?.message));
  } else {
    _supabase.rpc('decrement_favorites', { product_uuid: productId })
      .then(() => {}).catch((err) => console.warn('[Fav--]', err?.message));
  }
  return nowFav;
};