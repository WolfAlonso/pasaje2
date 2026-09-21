// =============================================================
// js/public-sidebar.js
// Sidebar público dinámico con control total de color y tipografía.
// =============================================================

(function () {
  'use strict';

  const SIDEBAR_ID        = 'pasajePublicSidebar';
  const OVERLAY_ID        = 'pasajePublicSidebarOverlay';
  const COLOR_MODE_KEY    = 'pasaje_user_color_mode';
  const SECTION_STATE_KEY = 'pasaje_public_sidebar_sections';

  let authState = { session: null, isAdmin: false, user: null };

  function getRootPrefix() {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/dashboard/')) return '../';
    return '';
  }

  function isDesktopSidebarPage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('index.html') || p.endsWith('/') || p.endsWith('index.htm') || p.includes('tienda.html') || p.includes('favoritos.html');
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

  function getColorMode() {
    try { return localStorage.getItem(COLOR_MODE_KEY) || 'auto'; }
    catch (e) { return 'auto'; }
  }

  function setColorMode(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(COLOR_MODE_KEY);
      else localStorage.setItem(COLOR_MODE_KEY, mode);
    } catch (e) {}
    applyColorMode();
  }

  function applyColorMode() {
    const mode = getColorMode();
    let isDark = false;
    if (mode === 'dark') isDark = true;
    else if (mode === 'light') isDark = false;
    else isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDark) document.body.classList.add('user-dark-mode');
    else document.body.classList.remove('user-dark-mode');
  }

  function injectStyles() {
    let s = document.getElementById('pasajeSidebarStyles');
    if (!s) {
      s = document.createElement('style');
      s.id = 'pasajeSidebarStyles';
      document.head.appendChild(s);
    }

    s.textContent = `
      #${SIDEBAR_ID} {
        transition: transform .3s cubic-bezier(.2,.7,.2,1), background-color .2s, color .2s;
        background-color: var(--pub-sidebar-bg, rgba(var(--pub-sidebar-tint-rgb, 255, 255, 255), var(--pub-sidebar-opacity, 0.85))) !important;
        backdrop-filter: blur(var(--pub-sidebar-blur, 20px)) saturate(160%) !important;
        -webkit-backdrop-filter: blur(var(--pub-sidebar-blur, 20px)) saturate(160%) !important;
        color: var(--pub-sidebar-text, #1e293b) !important;
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
      body.pasaje-sidebar-open { overflow: hidden; }

      #${SIDEBAR_ID} .pasaje-nav-link {
        transition: background .15s ease, color .15s ease, border .15s ease;
        text-decoration: none !important;
        border-radius: 0.75rem !important;
        border: none !important;
        border-left: 5px solid transparent !important;
        color: var(--pub-sidebar-text, #1e293b) !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link * {
        color: inherit !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link:hover {
        background: color-mix(in srgb, var(--pub-sidebar-active, var(--color-primary, #10b981)) 10%, transparent) !important;
        color: var(--pub-sidebar-active, var(--color-primary, #10b981)) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link:hover * {
        color: var(--pub-sidebar-active, var(--color-primary, #10b981)) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link.active {
        background: color-mix(in srgb, var(--pub-sidebar-active, var(--color-primary, #10b981)) 18%, transparent) !important;
        color: var(--pub-sidebar-active, var(--color-primary, #10b981)) !important;
        border-left: 5px solid var(--pub-sidebar-active, var(--color-primary, #10b981)) !important;
        font-weight: 800 !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-nav-link.active * {
        color: var(--pub-sidebar-active, var(--color-primary, #10b981)) !important;
        text-decoration: none !important;
      }

      #${SIDEBAR_ID} .pasaje-section-title {
        opacity: 0.75;
      }

      #${SIDEBAR_ID} .pasaje-section-body {
        display: grid;
        grid-template-rows: 1fr;
        transition: grid-template-rows .3s ease, opacity .2s ease;
        opacity: 1;
      }
      #${SIDEBAR_ID} .pasaje-section-body > .pasaje-section-inner {
        overflow: hidden;
        min-height: 0;
      }
      #${SIDEBAR_ID} .pasaje-section-body.collapsed {
        grid-template-rows: 0fr;
        opacity: 0;
      }

      #${SIDEBAR_ID} .pasaje-chevron {
        transition: transform .25s ease;
        opacity: 0.7;
      }
      #${SIDEBAR_ID} .pasaje-chevron.rotated {
        transform: rotate(180deg);
      }

      @media (min-width: 1024px) {
        body.pasaje-has-public-sidebar {
          padding-left: 18rem !important;
        }
        body.pasaje-has-public-sidebar #${SIDEBAR_ID} {
          transform: translateX(0) !important;
        }
        body.pasaje-has-public-sidebar #${OVERLAY_ID} {
          display: none !important;
        }
      }
    `;
  }

  async function checkAuthAndRole() {
    if (typeof window._supabase === 'undefined') return { session: null, isAdmin: false, user: null };
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (!session) return { session: null, isAdmin: false, user: null };

      let isAdmin = false;
      if (typeof window.isAdmin === 'function') {
        try { isAdmin = await window.isAdmin(); } catch (e) {}
      }
      if (!isAdmin && session.user) {
        const { data: profile } = await window._supabase
          .from('profiles')
          .select('is_admin, role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile && (profile.is_admin === true || profile.role === 'admin')) {
          isAdmin = true;
        }
      }
      return { session, isAdmin, user: session.user };
    } catch (e) {
      return { session: null, isAdmin: false, user: null };
    }
  }

  async function fetchCategories() {
    if (typeof window._supabase === 'undefined') return [];
    try {
      const { data } = await window._supabase
        .from('categories')
        .select('id, name, slug, icon, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    } catch (e) { return []; }
  }

  function renderCategoriesHTML(categories) {
    if (!categories || categories.length === 0) {
      return `<p class="text-xs opacity-50 px-3 py-2 italic">Sin categorías aún</p>`;
    }
    return categories.map(c => `
      <button type="button" onclick="if(window.setCatalogCategory) window.setCatalogCategory('${escapeHtml(c.slug)}')"
         class="pasaje-nav-link w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left">
        <span class="text-base flex-shrink-0">${escapeHtml(c.icon || '📦')}</span>
        <span class="truncate">${escapeHtml(c.name)}</span>
      </button>
    `).join('');
  }

  function renderLink(href, icon, label, extraClass = '') {
    const isCurrent = window.location.pathname.endsWith(href.replace('../', ''));
    return `
      <a href="${href}"
         class="pasaje-nav-link flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium ${isCurrent ? 'active' : ''} ${extraClass}">
        <span class="text-base flex-shrink-0">${icon}</span>
        <span class="truncate">${escapeHtml(label)}</span>
      </a>
    `;
  }

  function renderSection(id, title, innerHTML, openByDefault) {
    const open = isSectionOpen(id, openByDefault);
    return `
      <section data-acc-section="${id}" class="mb-1">
        <button type="button" data-acc-toggle="${id}"
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/5 transition">
          <span class="pasaje-section-title text-[10px] font-bold uppercase tracking-wider">${escapeHtml(title)}</span>
          <svg class="pasaje-chevron w-3.5 h-3.5 ${open ? '' : 'rotated'}"
               fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="pasaje-section-body ${open ? '' : 'collapsed'}">
          <div class="pasaje-section-inner">
            <div class="space-y-0.5 px-0.5 pb-1">${innerHTML}</div>
          </div>
        </div>
      </section>
    `;
  }

  function renderSidebar(categories, auth) {
    const R = getRootPrefix();

    let userSectionHTML = '';
    if (auth.session) {
      const email = auth.user ? auth.user.email : 'Usuario';
      userSectionHTML = `
        <div class="p-3 mb-2 rounded-2xl bg-black/5 border border-black/10">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">👤</span>
            <div class="min-w-0 flex-1">
              <p class="pasaje-text-main text-xs font-bold truncate">${escapeHtml(email)}</p>
              <p class="text-[10px] text-emerald-600 font-bold">● Sesión activa</p>
            </div>
          </div>
          <div class="space-y-1 pt-1 border-t border-black/10">
            ${renderLink(`${R}dashboard/dashboard.html`, '📊', 'Mi Panel Vendedor', 'font-bold')}
            ${auth.isAdmin ? renderLink(`${R}admin/admin.html`, '⚙️', 'Administración General', 'font-bold') : ''}
            <button type="button" id="publicSidebarLogoutBtn"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left mt-1">
              <span class="text-sm">🚪</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      `;
    } else {
      userSectionHTML = `
        <div class="p-2 mb-2 rounded-2xl bg-black/5 border border-black/10 space-y-1">
          ${renderLink(`${R}login.html`, '🔑', 'Iniciar Sesión', 'bg-emerald-600 !text-white font-bold hover:bg-emerald-700 shadow-sm')}
          ${renderLink(`${R}registro.html`, '🏪', 'Registrar mi Tienda')}
        </div>
      `;
    }

    const quickHTML = [
      renderLink(`${R}index.html`, '🏠', 'Inicio'),
      renderLink(`${R}index.html?featured=1`, '🔥', 'Ofertas y destacados'),
      renderLink(`${R}favoritos.html`, '❤️', 'Mis favoritos')
    ].join('');

    const appearanceHTML = `
      <div class="grid grid-cols-3 gap-1 px-1 pt-1">
        <button type="button" data-color-mode="light" class="pasaje-text-main flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition">
          <span class="text-lg">☀️</span><span>Claro</span>
        </button>
        <button type="button" data-color-mode="dark" class="pasaje-text-main flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition">
          <span class="text-lg">🌙</span><span>Oscuro</span>
        </button>
        <button type="button" data-color-mode="auto" class="pasaje-text-main flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition">
          <span class="text-lg">🌗</span><span>Auto</span>
        </button>
      </div>
    `;

    const infoHTML = [
      renderLink(`${R}nosotros.html`, '💚', 'Sobre nosotros'),
      renderLink(`${R}terminos.html`, '📄', 'Términos de uso')
    ].join('');

    const catsHTML = renderCategoriesHTML(categories);

    return `
      <aside id="${SIDEBAR_ID}"
        class="fixed inset-y-0 left-0 z-[60] w-72 max-w-[86vw] flex flex-col shadow-2xl"
        style="transform: translateX(-100%);">

        <div class="flex items-center justify-between px-4 py-3.5 border-b border-black/10 flex-shrink-0">
          <a href="${R}index.html" class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-base shadow-sm flex-shrink-0">🏔️</span>
            <div class="leading-tight min-w-0">
              <div class="font-extrabold text-sm truncate pasaje-title">Pasaje de los Altos</div>
              <div class="text-[10px] opacity-60 font-medium truncate pasaje-title">Catálogo Regional</div>
            </div>
          </a>
          <button type="button" id="${SIDEBAR_ID}Close"
            class="lg:hidden bg-black/5 hover:bg-black/10 w-8 h-8 rounded-xl flex items-center justify-center transition font-bold text-xs pasaje-title">
            ✕
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto p-2">
          ${userSectionHTML}
          ${renderSection('quick', 'Navegación', quickHTML, true)}
          ${renderSection('cats', 'Categorías', `<div id="${SIDEBAR_ID}Categories">${catsHTML}</div>`, true)}
          ${renderSection('appearance', 'Apariencia', appearanceHTML, false)}
          ${renderSection('info', 'Información', infoHTML, false)}
        </nav>

        <div class="px-4 py-3 border-t border-black/10 flex-shrink-0 bg-black/5">
          <p class="text-[10px] opacity-60 text-center font-medium pasaje-title">
            © ${new Date().getFullYear()} Pasaje de los Altos
          </p>
        </div>
      </aside>

      <div id="${OVERLAY_ID}" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"></div>
    `;
  }

  function openSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    const overlay = document.getElementById(OVERLAY_ID);
    if (!sidebar || !overlay) return;
    overlay.classList.remove('hidden');
    sidebar.classList.add('open');
    sidebar.style.transform = 'translateX(0)';
    document.body.classList.add('pasaje-sidebar-open');
  }

  function closeSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    const overlay = document.getElementById(OVERLAY_ID);
    if (!sidebar || !overlay) return;
    overlay.classList.add('hidden');
    sidebar.classList.remove('open');
    sidebar.style.transform = 'translateX(-100%)';
    document.body.classList.remove('pasaje-sidebar-open');
  }

  function togglePublicSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  function bindEvents() {
    const overlay   = document.getElementById(OVERLAY_ID);
    const closeBtn  = document.getElementById(`${SIDEBAR_ID}Close`);
    const logoutBtn = document.getElementById('publicSidebarLogoutBtn');

    if (overlay)  overlay.addEventListener('click', closeSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try { if (window._supabase) await window._supabase.auth.signOut(); } catch (e) {}
        localStorage.removeItem('activeStoreId');
        window.location.reload();
      });
    }

    document.querySelectorAll(`[data-acc-toggle]`).forEach(btn => {
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

    document.addEventListener('click', (e) => {
      const colorBtn = e.target.closest('[data-color-mode]');
      if (!colorBtn) return;
      setColorMode(colorBtn.dataset.colorMode);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  async function init() {
    injectStyles();
    applyColorMode();

    if (isDesktopSidebarPage()) {
      document.body.classList.add('pasaje-has-public-sidebar');
    }

    const [categories, auth] = await Promise.all([
      fetchCategories(),
      checkAuthAndRole()
    ]);
    authState = auth;

    document.getElementById(SIDEBAR_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();

    const mount = document.getElementById('publicSidebar');
    if (mount) mount.innerHTML = renderSidebar(categories, authState);
    else document.body.insertAdjacentHTML('beforeend', renderSidebar(categories, authState));

    bindEvents();
  }

  window.togglePublicSidebar = togglePublicSidebar;
  window.PasajePublicSidebar = { open: openSidebar, close: closeSidebar, toggle: togglePublicSidebar };

  window.addEventListener('pasaje:theme-applied', () => { injectStyles(); });
  window.addEventListener('pasaje:sidebar-updated', () => { injectStyles(); });
  window.addEventListener('input', (e) => {
    if (e.target && e.target.id && (e.target.id.includes('sidebar') || e.target.id.includes('Sidebar') || e.target.id.includes('Color') || e.target.id.includes('Tint') || e.target.id.includes('Opacity') || e.target.id.includes('Blur'))) {
      injectStyles();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();