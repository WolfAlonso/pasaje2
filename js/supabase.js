// js/supabase.js
const SUPABASE_URL = 'https://wdhfsagzjkdjtwdjbgkp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkaGZzYWd6amtkanR3ZGpiZ2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDU1ODAsImV4cCI6MjEwNTMyMTU4MH0.cpFNV8vKmKsHp1qMXFWw-lnDMICXJgfnCAgJ3ZBTiuQ';

// Inicializador robusto con soporte para carga diferida de CDN
window.initSupabaseClient = function() {
  if (window._supabase) return window._supabase;
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    try {
      window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return window._supabase;
    } catch (e) {
      console.error('[Supabase Init Exception]', e);
    }
  }
  return null;
};

// Intento de inicialización inmediata
initSupabaseClient();

if (!window._supabase) {
  let attempts = 0;
  const retryInterval = setInterval(() => {
    attempts++;
    if (initSupabaseClient()) {
      clearInterval(retryInterval);
    } else if (attempts >= 15) {
      clearInterval(retryInterval);
    }
  }, 200);
}

// ---------------------------------------------------------------
// Enrutamiento Inteligente por Rol
// ---------------------------------------------------------------
window.routeUserToDashboard = async function(userId) {
  const client = initSupabaseClient();
  if (!client || !userId) {
    window.location.replace('dashboard/dashboard.html');
    return;
  }

  try {
    const { data: roles } = await client
      .from('user_roles')
      .select('is_merchant, is_delivery, is_real_estate')
      .eq('user_id', userId)
      .maybeSingle();

    const isMerchant = roles ? roles.is_merchant !== false : true;
    const isDelivery = roles ? !!roles.is_delivery : false;
    const isRealEstate = roles ? !!roles.is_real_estate : false;

    const savedMode = localStorage.getItem('pasajeDashMode');

    if (savedMode === 'delivery' && isDelivery) {
      window.location.replace('dashboard/dashboard-delivery.html');
      return;
    }
    if (savedMode === 'real_estate' && isRealEstate) {
      window.location.replace('dashboard/dashboard-inmuebles.html');
      return;
    }
    if (savedMode === 'merchant' && isMerchant) {
      window.location.replace('dashboard/dashboard-productos.html');
      return;
    }

    if (isMerchant) {
      localStorage.setItem('pasajeDashMode', 'merchant');
      window.location.replace('dashboard/dashboard-productos.html');
    } else if (isDelivery) {
      localStorage.setItem('pasajeDashMode', 'delivery');
      window.location.replace('dashboard/dashboard-delivery.html');
    } else if (isRealEstate) {
      localStorage.setItem('pasajeDashMode', 'real_estate');
      window.location.replace('dashboard/dashboard-inmuebles.html');
    } else {
      window.location.replace('index.html');
    }
  } catch (err) {
    console.warn('[Routing Error]', err);
    window.location.replace('dashboard/dashboard.html');
  }
};

window.handleSupabaseError = (error, contexto = 'Operación') => {
  console.error(`[${contexto}]`, error);
  alert(`${contexto}: ${error?.message || error}`);
};

window.requireAuth = async () => {
  const client = initSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) { window.location.replace('login.html'); return null; }
  return session;
};

window.redirectIfAuthenticated = async () => {
  const client = initSupabaseClient();
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    await routeUserToDashboard(session.user.id);
  }
};

window.cleanPhone = (phone) => (phone || '').replace(/\D/g, '');
window.PLACEHOLDER_IMG = 'img/placeholder.png';

window.uploadImage = async (file, bucket, userId) => {
  const client = initSupabaseClient();
  if (!client) throw new Error('Supabase no está disponible.');
  if (!file) return null;
  const MAX_MB = bucket === 'logos' ? 2 : 5;
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`La imagen excede ${MAX_MB} MB.`);

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await client.storage
    .from(bucket).upload(filename, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  const { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
};

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
  count() { return this.getAll().length; }
};