// =============================================================
// js/dashboard-sidebar.js
// Sidebar y Topbar adaptativos con botón "Ir al Catálogo" superior,
// Asistente de Ventas AI y Kit Imprimible QR.
// =============================================================

(function () {
  'use strict';

  const ROOT              = '../';
  const ACTIVE_STORE_KEY  = 'activeStoreId';
  const SIDEBAR_ID        = 'pasajeDashSidebar';
  const OVERLAY_ID        = 'pasajeDashSidebarOverlay';
  const SECTION_STATE_KEY = 'pasaje_dash_sidebar_sections';

  const SECTIONS = [
    {
      id: 'commercial',
      title: 'Gestión Comercial',
      openByDefault: true,
      items: [
        { key: 'productos', label: 'Productos e Inventario', href: 'dashboard-productos.html', icon: '📦' },
        { key: 'pedidos',   label: 'Pedidos',                href: 'dashboard-pedidos.html',   icon: '🛒', badge: 'pedidos' },
        { key: 'cupones',   label: 'Cupones',                href: 'dashboard-cupones.html',   icon: '🎟️' },
        { key: 'tiendas',   label: 'Mis Tiendas',            href: 'dashboard-tiendas.html',   icon: '🏪' }
      ]
    },
    {
      id: 'analytics',
      title: 'Análisis y Clientes',
      openByDefault: true,
      items: [
        { key: 'metricas',  label: 'Métricas y Ventas', href: 'dashboard-metricas.html', icon: '📊' },
        { key: 'clientes',  label: 'Clientes',          href: 'dashboard-clientes.html', icon: '👥' },
        { key: 'zonas',     label: 'Zonas y Mapa',      href: 'dashboard-zonas.html',    icon: '🗺️' }
      ]
    },
    {
      id: 'tools',
      title: 'Herramientas',
      openByDefault: true,
      items: [
        { key: 'asistente-ai',    label: 'Asistente de Ventas AI', href: 'dashboard-asistente-ai.html', icon: '🪄' },
        { key: 'material',        label: 'Kit Imprimible QR',      href: 'dashboard-material.html',     icon: '🖨️' },
        { key: 'calculadora',     label: 'Calculadora Producción', href: 'dashboard-calculadora.html',  icon: '🧮' },
        { key: 'calculadora-rev', label: 'Calculadora Reventa',    href: 'dashboard-calculadora2.html', icon: '🛍️' },
        { key: 'soporte',         label: 'Soporte y Casos',        href: 'dashboard-soporte.html',      icon: '🎧', badge: 'soporte' }
      ]
    }
  ];

  function idEq(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return String(a) === String(b);
  }

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || '';
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSectionState() {
    try { return JSON.parse(localStorage.getItem(SECTION_STATE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveSectionState(state) {
    try { localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function isSectionOpen(id, defaultOpen) {
    const state = getSectionState();
    return Object.prototype.hasOwnProperty.call(state, id) ? !!state[id] : !!defaultOpen;
  }

  async function getMyStores() {
    const session = await requireAuth();
    if (!session) return { session: null, stores: [] };

    const { data, error } = await _supabase
      .from('stores')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DashboardSidebar] getMyStores:', error);
      return { session, stores: [] };
    }
    return { session, stores: data || [] };
  }

  async function getActiveStore() {
    const { session, stores } = await getMyStores();
    if (!session) return { session: null, stores: [], store: null };
    if (stores.length === 0) return { session, stores: [], store: null };

    const storedId = localStorage.getItem(ACTIVE_STORE_KEY);
    let active = stores.find(s => idEq(s.id, storedId));

    if (!active) {
      active = stores[0];
      localStorage.setItem(ACTIVE_STORE_KEY, String(active.id));
    }
    return { session, stores, store: active };
  }

  function setActiveStore(storeId) {
    if (!storeId) return;
    localStorage.setItem(ACTIVE_STORE_KEY, String(storeId));
  }

  function clearActiveStore() {
    localStorage.removeItem(ACTIVE_STORE_KEY);
  }

  async function loadMyStore() {
    const { store } = await getActiveStore();
    return store;
  }

  async function guardDashboardPage() {
    const { session, stores, store } = await getActiveStore();
    if (!session) return { session: null, stores: [], store: null };
    if (!store) {
      window.location.replace('dashboard.html');
      return { session, stores: [], store: null };
    }
    return { session, stores, store };
  }

  function injectStyles() {
    let s = document.getElementById('pasajeDashSidebarStyles');
    if (!s) {
      s = document.createElement('style');
      s.id = 'pasajeDashSidebarStyles';
      document.head.appendChild(s);
    }

    s.textContent = `
      #${SIDEBAR_ID} {
        transition: transform .3s cubic-bezier(.2,.7,.2,1), background-color .2s, color .2s;
        background-color: var(--dash-sidebar-bg, rgba(var(--dash-sidebar-tint-rgb, 255, 255, 255), var(--dash-sidebar-opacity, 0.88))) !important;
        backdrop-filter: blur(var(--dash-sidebar-blur, 20px)) saturate(160%) !important;
        -webkit-backdrop-filter: blur(var(--dash-sidebar-blur, 20px)) saturate(160%) !important;
        color: var(--dash-sidebar-text, #1e293b) !important;
        border-right: 1px solid rgba(148, 163, 184, 0.25);
      }

      #${SIDEBAR_ID} a,
      #${SIDEBAR_ID} button,
      #${SIDEBAR_ID} span,
      #${SIDEBAR_ID} p,
      #${SIDEBAR_ID} div {
        text-decoration: none !important;
      }

      #${SIDEBAR_ID}.open { transform: translateX(0) !important; }
      body.pasaje-dash-sidebar-open { overflow: hidden; }

      #${SIDEBAR_ID} .pasaje-nav-link {
        transition: background .15s ease, color .15s ease, border .15s ease;
        text-decoration: none !important;
        border-radius: 0.75rem !important;
        border: none !important;
        border-left: 5px solid transparent !important;
        color: var(--dash-sidebar-text, #1e293b) !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link * {
        color: inherit !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link:hover {
        background: color-mix(in srgb, var(--dash-sidebar-active, #10b981) 10%, transparent) !important;
        color: var(--dash-sidebar-active, #10b981) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link:hover * {
        color: var(--dash-sidebar-active, #10b981) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link.active {
        background: color-mix(in srgb, var(--dash-sidebar-active, #10b981) 18%, transparent) !important;
        color: var(--dash-sidebar-active, #10b981) !important;
        border-left: 5px solid var(--dash-sidebar-active, #10b981) !important;
        font-weight: 800 !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link.active * {
        color: var(--dash-sidebar-active, #10b981) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-section-title {
        opacity: 0.75;
      }

      #${SIDEBAR_ID} .pasaje-section-body {
        display: grid; grid-template-rows: 1fr;
        transition: grid-template-rows .3s ease, opacity .2s ease; opacity: 1;
      }
      #${SIDEBAR_ID} .pasaje-section-body > .pasaje-section-inner { overflow: hidden; min-height: 0; }
      #${SIDEBAR_ID} .pasaje-section-body.collapsed { grid-template-rows: 0fr; opacity: 0; }
      #${SIDEBAR_ID} .pasaje-chevron { transition: transform .25s ease; opacity: 0.7; }
      #${SIDEBAR_ID} .pasaje-chevron.rotated { transform: rotate(180deg); }

      .dash-topbar-dynamic {
        background-color: rgba(var(--header-glass-tint-rgb, var(--color-primary-rgb, 30, 58, 138)), var(--header-glass-opacity, 0.95)) !important;
        backdrop-filter: blur(var(--header-glass-blur, 16px)) saturate(160%) !important;
        -webkit-backdrop-filter: blur(var(--header-glass-blur, 16px)) saturate(160%) !important;
        color: #ffffff !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      }

      @media (min-width: 1024px) {
        body.pasaje-has-dash-sidebar {
          padding-left: 17rem !important;
        }
        body.pasaje-has-dash-sidebar #${SIDEBAR_ID} {
          transform: translateX(0) !important;
        }
        body.pasaje-has-dash-sidebar #${OVERLAY_ID} {
          display: none !important;
        }
      }
    `;
  }

  function storeAvatarHTML(store, sizeClasses, textClasses) {
    const rawName = (store && store.name) ? String(store.name).trim() : '?';
    const initial = escapeHtml((rawName.charAt(0) || '?').toUpperCase());
    if (store && store.logo_url) {
      return `<img src="${escapeHtml(store.logo_url)}" alt="" class="${sizeClasses} rounded-full object-cover flex-shrink-0 border border-white/70 shadow-sm">`;
    }
    return `<div class="${sizeClasses} rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-extrabold flex-shrink-0 shadow-sm ${textClasses}">${initial}</div>`;
  }

  function renderSection(section, currentPage) {
    const open = isSectionOpen(section.id, section.openByDefault);
    const itemsHTML = section.items.map(m => {
      const isActive = currentPage === m.href;
      const badgeHTML = m.badge
        ? `<span data-dash-badge="${m.badge}" class="hidden ml-auto text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">0</span>`
        : '';
      return `
        <a href="${m.href}" class="pasaje-nav-link flex items-center gap-3 pl-3 pr-2 py-2 rounded-r-xl text-sm ${isActive ? 'active' : ''}">
          <span class="text-lg flex-shrink-0">${m.icon}</span>
          <span class="truncate">${escapeHtml(m.label)}</span>
          ${badgeHTML}
        </a>
      `;
    }).join('');

    return `
      <section data-acc-section="${section.id}" class="mb-1">
        <button type="button" data-acc-toggle="${section.id}" class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/5 transition">
          <span class="pasaje-section-title text-[10px] font-bold uppercase tracking-wider">${escapeHtml(section.title)}</span>
          <svg class="pasaje-chevron w-3.5 h-3.5 ${open ? '' : 'rotated'}" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="pasaje-section-body ${open ? '' : 'collapsed'}">
          <div class="pasaje-section-inner"><div class="space-y-0.5 pb-1">${itemsHTML}</div></div>
        </div>
      </section>
    `;
  }

  function renderStoreSwitcher(store, stores) {
    if (!stores || stores.length === 0 || !store) {
      return `
        <div class="px-3 pt-2 pb-2 flex-shrink-0">
          <div class="p-3 rounded-2xl bg-black/5 border border-black/10 shadow-sm text-center">
            <p class="text-xs opacity-70 mb-2">Sin tiendas registradas</p>
            <a href="dashboard-tiendas.html" class="inline-flex items-center gap-1 text-[11px] bg-emerald-600 !text-white font-bold py-1.5 px-3 rounded-lg transition">+ Crear primera tienda</a>
          </div>
        </div>
      `;
    }

    const storeItems = stores.map(s => {
      const isActive = idEq(s.id, store.id);
      return `
        <button type="button" data-store-id="${escapeHtml(s.id)}" class="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-black/5 transition ${isActive ? 'bg-black/10' : ''}">
          ${storeAvatarHTML(s, 'w-7 h-7', 'text-xs')}
          <span class="flex-1 truncate text-left text-xs font-semibold">${escapeHtml(s.name)}</span>
          ${isActive ? '<span class="text-emerald-500 text-sm font-bold">✓</span>' : ''}
        </button>
      `;
    }).join('');

    return `
      <div class="px-3 pt-2 pb-2 flex-shrink-0">
        <details id="${SIDEBAR_ID}StoreSwitcher" class="group">
          <summary class="cursor-pointer select-none">
            <div class="flex items-center gap-3 p-2 rounded-2xl bg-black/5 hover:bg-black/10 border border-black/10 shadow-sm transition-all">
              ${storeAvatarHTML(store, 'w-10 h-10', 'text-sm')}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Activa</span>
                </div>
                <div class="text-xs font-bold truncate">${escapeHtml(store.name)}</div>
              </div>
              <svg class="w-4 h-4 opacity-50 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </summary>
          <div class="mt-2 rounded-2xl bg-white/95 text-slate-900 border border-black/10 shadow-xl p-1.5">
            <div class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tus tiendas (${stores.length})</div>
            ${storeItems}
            <a href="dashboard-tiendas.html" class="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-700 transition mt-1 border-t border-gray-100 pt-2"><span class="text-base leading-none">+</span> Nueva tienda</a>
          </div>
        </details>
      </div>
    `;
  }

  function renderSidebar(user, store, stores) {
    const current = getCurrentPage();
    const sectionsHTML = SECTIONS.map(sec => renderSection(sec, current)).join('');

    return `
      <aside id="${SIDEBAR_ID}" class="fixed inset-y-0 left-0 z-[60] w-[17rem] flex flex-col shadow-2xl" style="transform: translateX(-100%);">
        <div class="flex items-center justify-between px-4 py-3 border-b border-black/10 flex-shrink-0">
          <a href="${ROOT}index.html" class="flex items-center gap-2 min-w-0">
            <span class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg shadow-sm">🏔️</span>
            <div class="leading-tight min-w-0">
              <div class="font-extrabold text-sm truncate">Pasaje de los <span class="text-emerald-500">Altos</span></div>
              <div class="text-[10px] opacity-70 font-medium truncate">Panel Emprendedor</div>
            </div>
          </a>
          <button type="button" id="${SIDEBAR_ID}Close" class="lg:hidden bg-black/10 hover:bg-black/20 w-8 h-8 rounded-xl flex items-center justify-center transition flex-shrink-0 font-bold text-xs">✕</button>
        </div>

        <div class="px-3 pt-3 pb-1 flex-shrink-0">
          <a href="${ROOT}index.html"
             class="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold bg-black/10 hover:bg-black/20 border border-black/10 transition shadow-sm !text-emerald-600 no-underline">
            <span class="text-base">🏠</span>
            <span>Ir al Catálogo Público</span>
          </a>
        </div>

        ${renderStoreSwitcher(store, stores)}
        <nav class="flex-1 overflow-y-auto px-2 py-1">${sectionsHTML}</nav>
        <div class="border-t border-black/10 flex-shrink-0 bg-black/5">
          <div class="px-4 py-2 text-[11px] opacity-70 truncate">${escapeHtml(user.email || '')}</div>
          <button id="dashboardLogoutBtn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold !text-red-500 hover:bg-red-500/10 transition border-t border-black/10"><span class="text-lg">🚪</span> <span>Cerrar sesión</span></button>
        </div>
      </aside>
      <div id="${OVERLAY_ID}" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden"></div>
    `;
  }

  function renderTopbar(user, store) {
    return `
      <header class="dash-topbar-dynamic shadow-lg sticky top-0 z-40">
        <div class="px-4 py-3 flex justify-between items-center gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button type="button" id="${SIDEBAR_ID}Open" class="lg:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg transition flex-shrink-0" aria-label="Abrir menú">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <a href="${ROOT}index.html" class="text-lg font-extrabold truncate">Pasaje de los <span class="text-emerald-400">Altos</span></a>
            ${store ? `<span class="hidden sm:inline text-xs opacity-80 truncate max-w-[180px]">· ${escapeHtml(store.name)}</span>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <a href="${ROOT}index.html" class="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-semibold transition">Ver catálogo</a>
          </div>
        </div>
      </header>
    `;
  }

  function openSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    const ov = document.getElementById(OVERLAY_ID);
    if (!el || !ov) return;
    ov.classList.remove('hidden');
    el.classList.add('open');
    el.style.transform = 'translateX(0)';
    document.body.classList.add('pasaje-dash-sidebar-open');
  }

  function closeSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    const ov = document.getElementById(OVERLAY_ID);
    if (!el || !ov) return;
    ov.classList.add('hidden');
    el.classList.remove('open');
    el.style.transform = 'translateX(-100%)';
    document.body.classList.remove('pasaje-dash-sidebar-open');
  }

  function toggleSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    if (!el) return;
    if (el.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  async function loadSupportBadge(storeId) {
    try {
      const { count, error } = await _supabase.from('reports').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'pending');
      if (error) return;
      const badge = document.querySelector('[data-dash-badge="soporte"]');
      if (!badge) return;
      const n = count ?? 0;
      if (n === 0) { badge.classList.add('hidden'); badge.textContent = ''; }
      else { badge.textContent = n; badge.classList.remove('hidden'); }
    } catch (e) {}
  }

  async function loadOrdersBadge(storeId) {
    try {
      const { count, error } = await _supabase.from('cart_orders').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'sent');
      if (error) return;
      const badge = document.querySelector('[data-dash-badge="pedidos"]');
      if (!badge) return;
      const n = count ?? 0;
      if (n === 0) { badge.classList.add('hidden'); badge.textContent = ''; }
      else { badge.textContent = n; badge.classList.remove('hidden'); }
    } catch (e) {}
  }

  function bindAccordion() {
    document.querySelectorAll(`#${SIDEBAR_ID} [data-acc-toggle]`).forEach(btn => {
      if (btn.dataset.accBound) return;
      btn.dataset.accBound = '1';
      btn.addEventListener('click', () => {
        const id = btn.dataset.accToggle;
        const section = btn.closest('[data-acc-section]');
        if (!section) return;
        const body = section.querySelector('.pasaje-section-body');
        const chevron = btn.querySelector('.pasaje-chevron');
        const collapsed = body.classList.toggle('collapsed');
        if (chevron) chevron.classList.toggle('rotated', collapsed);
        const state = getSectionState();
        state[id] = !collapsed;
        saveSectionState(state);
      });
    });
  }

  function bindStoreSwitcher(store) {
    document.querySelectorAll(`#${SIDEBAR_ID} [data-store-id]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const newId = btn.dataset.storeId;
        if (idEq(newId, store && store.id)) {
          const sw = document.getElementById(`${SIDEBAR_ID}StoreSwitcher`);
          if (sw) sw.open = false;
          return;
        }
        setActiveStore(newId);
        window.location.reload();
      });
    });

    document.addEventListener('click', (e) => {
      const sw = document.getElementById(`${SIDEBAR_ID}StoreSwitcher`);
      if (sw && sw.open && !sw.contains(e.target)) sw.open = false;
    });
  }

  async function initDashboardNav({ user, store, stores } = {}) {
    if (!user) return;

    if (typeof dashInjectFilterStyles === 'function') dashInjectFilterStyles();
    injectStyles();

    if (!stores) {
      const res = await getMyStores();
      stores = res.stores;
    }

    if (!store && stores.length > 0) {
      const storedId = localStorage.getItem(ACTIVE_STORE_KEY);
      store = stores.find(s => idEq(s.id, storedId)) || stores[0];
      if (!idEq(localStorage.getItem(ACTIVE_STORE_KEY), store.id)) {
        localStorage.setItem(ACTIVE_STORE_KEY, String(store.id));
      }
    }

    document.getElementById(SIDEBAR_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();

    document.body.insertAdjacentHTML('beforeend', renderSidebar(user, store, stores));
    document.body.classList.add('pasaje-has-dash-sidebar');

    const headerMount = document.getElementById('dashboardHeader');
    if (headerMount) headerMount.innerHTML = renderTopbar(user, store);
    else document.body.insertAdjacentHTML('afterbegin', renderTopbar(user, store));

    const tabsMount = document.getElementById('dashboardTabs');
    if (tabsMount) tabsMount.innerHTML = '';

    const openBtn  = document.getElementById(`${SIDEBAR_ID}Open`);
    const closeBtn = document.getElementById(`${SIDEBAR_ID}Close`);
    const overlay  = document.getElementById(OVERLAY_ID);

    if (openBtn)  openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay)  overlay.addEventListener('click', closeSidebar);

    bindAccordion();
    bindStoreSwitcher(store);

    const logoutBtn = document.getElementById('dashboardLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try { await _supabase.auth.signOut(); } catch (e) {}
        clearActiveStore();
        window.location.replace(ROOT + 'login.html');
      });
    }

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

    if (store && store.id) {
      loadSupportBadge(store.id);
      loadOrdersBadge(store.id);
    }
  }

  window.initDashboardNav       = initDashboardNav;
  window.initDashboardSidebar   = initDashboardNav;
  window.getMyStores            = getMyStores;
  window.getActiveStore         = getActiveStore;
  window.setActiveStore         = setActiveStore;
  window.clearActiveStore       = clearActiveStore;
  window.loadMyStore            = loadMyStore;
  window.guardDashboardPage     = guardDashboardPage;
  window.dashIdEq               = idEq;
  window.toggleDashboardSidebar = toggleSidebar;

  window.addEventListener('pasaje:theme-applied', () => { injectStyles(); });
  window.addEventListener('pasaje:sidebar-updated', () => { injectStyles(); });
  window.addEventListener('input', (e) => {
    if (e.target && e.target.id && (e.target.id.includes('sidebar') || e.target.id.includes('Sidebar') || e.target.id.includes('Color') || e.target.id.includes('Tint') || e.target.id.includes('Opacity') || e.target.id.includes('Blur'))) {
      injectStyles();
    }
  });
})();