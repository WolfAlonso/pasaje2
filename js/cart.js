// =============================================================
// /js/cart.js
// Gestor de Carrito de Compras (Con Rastreo en Vivo Garantizado)
// =============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'pasaje_cart_items';
  let cartItems = [];
  let deliveryType = 'pickup';

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cartItems = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cartItems)) cartItems = [];
  } catch (e) {
    cartItems = [];
  }

  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems)); } catch (e) {}
    updateCartBadge();
  }

  function updateCartBadge() {
    const totalCount = cartItems.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 1), 0);
    document.querySelectorAll('.cart-count-badge').forEach(el => {
      el.textContent = totalCount;
      if (totalCount > 0) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  }

  function addToCart(product) {
    if (!product || !product.id) return;
    const pId = String(product.id);
    const variantKey = product.selectedVariant || null;
    const existing = cartItems.find(item => String(item.id) === pId && item.selectedVariant === variantKey);

    if (existing) {
      existing.quantity = (parseInt(existing.quantity, 10) || 1) + 1;
    } else {
      cartItems.push({
        id: product.id,
        title: product.title || 'Producto',
        price: parseFloat(product.price || 0),
        image_url: product.image_url || '',
        storeId: product.storeId || null,
        storeName: product.storeName || 'Tienda local',
        storeWhatsapp: product.storeWhatsapp || '',
        quantity: 1,
        selectedVariant: variantKey
      });
    }
    saveCart();
    openDrawer();
  }

  function removeFromCart(index) {
    if (index >= 0 && index < cartItems.length) {
      cartItems.splice(index, 1);
      saveCart();
      renderCartDrawer();
    }
  }

  function updateQuantity(index, delta) {
    if (index >= 0 && index < cartItems.length) {
      const newQty = (parseInt(cartItems[index].quantity, 10) || 1) + delta;
      if (newQty <= 0) cartItems.splice(index, 1);
      else cartItems[index].quantity = newQty;
      saveCart();
      renderCartDrawer();
    }
  }

  function buildCartUI() {
    if (document.getElementById('cartDrawerOverlay')) return;
    if (!document.body) return;

    const drawerHTML = `
      <div id="cartDrawerOverlay" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity">
        <div id="cartDrawer" class="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden transition-transform duration-200 transform translate-x-full">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div class="flex items-center gap-2">
              <span class="text-xl">🛒</span>
              <h2 class="font-extrabold text-base">Mi Carrito de Compras</h2>
            </div>
            <button id="closeCartDrawerBtn" type="button" class="text-slate-300 hover:text-white text-lg font-bold p-1">✕</button>
          </div>
          <div id="cartItemsContainer" class="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100"></div>
          <div class="p-4 bg-slate-50 border-t border-slate-200/80 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">🚚 Método de Entrega *</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" id="deliveryTabPickup" class="delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-emerald-600 text-white border-emerald-600 shadow-sm"><span>🏪 Recoger (Pickup)</span></button>
                <button type="button" id="deliveryTabDelivery" class="delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-white text-slate-700 border-slate-200 hover:border-emerald-500"><span>🛵 Envío a domicilio</span></button>
              </div>
            </div>
            <div id="deliveryFieldsContainer" class="hidden space-y-2 pt-1">
              <input type="text" id="cartCustomerName" placeholder="Tu nombre completo *" class="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-white text-slate-800 outline-none font-semibold">
              <input type="text" id="cartDeliveryAddress" placeholder="Dirección de entrega (Calle, No. Casa, Zona) *" class="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-white text-slate-800 outline-none font-semibold">
              <input type="text" id="cartDeliveryRef" placeholder="Referencia / Municipio (opcional)" class="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-white text-slate-800 outline-none font-semibold">
            </div>
            <div class="flex items-center justify-between pt-2">
              <span class="text-xs font-bold text-slate-500 uppercase">Total a pagar:</span>
              <span id="cartTotalDisplay" class="text-xl font-black text-emerald-600">Q 0.00</span>
            </div>
            <button type="button" id="checkoutWaBtn" class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2">
              <span>Pedir por WhatsApp con Rastreo</span>
            </button>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    document.getElementById('closeCartDrawerBtn')?.addEventListener('click', closeDrawer);
    document.getElementById('cartDrawerOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('cartDrawerOverlay')) closeDrawer();
    });

    const tabPickup = document.getElementById('deliveryTabPickup');
    const tabDelivery = document.getElementById('deliveryTabDelivery');
    const fieldsContainer = document.getElementById('deliveryFieldsContainer');

    tabPickup?.addEventListener('click', () => {
      deliveryType = 'pickup';
      tabPickup.className = 'delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-emerald-600 text-white border-emerald-600 shadow-sm';
      tabDelivery.className = 'delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-white text-slate-700 border-slate-200 hover:border-emerald-500';
      fieldsContainer?.classList.add('hidden');
    });

    tabDelivery?.addEventListener('click', () => {
      deliveryType = 'delivery';
      tabDelivery.className = 'delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-emerald-600 text-white border-emerald-600 shadow-sm';
      tabPickup.className = 'delivery-type-btn text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition bg-white text-slate-700 border-slate-200 hover:border-emerald-500';
      fieldsContainer?.classList.remove('hidden');
    });

    document.getElementById('checkoutWaBtn')?.addEventListener('click', handleCheckout);
  }

  function renderCartDrawer() {
    buildCartUI();
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalDisplay');
    const placeholder = window.PLACEHOLDER_IMG || 'img/placeholder.png';
    if (!container) return;

    if (cartItems.length === 0) {
      container.innerHTML = '<div class="py-12 text-center text-slate-400"><p class="text-4xl mb-2">🛒</p><p class="text-xs font-bold text-slate-600">Tu carrito está vacío</p></div>';
      if (totalEl) totalEl.textContent = 'Q 0.00';
      return;
    }

    let total = 0;
    container.innerHTML = cartItems.map((item, idx) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const itemTotal = (parseFloat(item.price) || 0) * qty;
      total += itemTotal;
      const variantTxt = item.selectedVariant ? ` (${item.selectedVariant})` : '';
      return `
        <div class="pt-3 flex items-center gap-3">
          <img src="${item.image_url || placeholder}" class="w-12 h-12 rounded-xl object-cover bg-slate-100 border flex-shrink-0">
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-800 truncate">${item.title}${variantTxt}</h4>
            <p class="text-[11px] text-slate-500">🏪 ${item.storeName || 'Tienda'}</p>
            <p class="text-xs font-black text-emerald-600">Q ${itemTotal.toFixed(2)}</p>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
            <button type="button" data-cart-action="minus" data-index="${idx}" class="w-6 h-6 rounded bg-white font-bold text-slate-700 text-xs">-</button>
            <span class="text-xs font-extrabold px-1">${qty}</span>
            <button type="button" data-cart-action="plus" data-index="${idx}" class="w-6 h-6 rounded bg-white font-bold text-slate-700 text-xs">+</button>
          </div>
          <button type="button" data-cart-action="remove" data-index="${idx}" class="text-slate-400 hover:text-rose-500 p-1 text-xs">🗑️</button>
        </div>`;
    }).join('');

    if (totalEl) totalEl.textContent = `Q ${total.toFixed(2)}`;

    container.querySelectorAll('[data-cart-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.cartAction;
        const idx = parseInt(btn.dataset.index, 10);
        if (action === 'plus') updateQuantity(idx, 1);
        if (action === 'minus') updateQuantity(idx, -1);
        if (action === 'remove') removeFromCart(idx);
      };
    });
  }

  async function handleCheckout() {
    if (cartItems.length === 0) { alert('Tu carrito está vacío.'); return; }

    const firstStore = cartItems[0];
    const cleanPhone = window.cleanPhone || (raw => String(raw || '').replace(/\D/g, ''));
    const phone = cleanPhone(firstStore.storeWhatsapp);

    if (!phone) { alert('No se pudo determinar el WhatsApp de la tienda.'); return; }

    let customerName = document.getElementById('cartCustomerName')?.value.trim() || 'Cliente';
    let address = document.getElementById('cartDeliveryAddress')?.value.trim() || '';
    let reference = document.getElementById('cartDeliveryRef')?.value.trim() || '';

    if (deliveryType === 'delivery' && !address) { alert('Por favor ingresa la dirección para el envío.'); return; }

    let total = cartItems.reduce((sum, i) => sum + ((parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1)), 0);

    let orderUuid = null;
    try {
      if (typeof _supabase !== 'undefined') {
        const { data, error } = await _supabase.from('cart_orders').insert([{
          store_id: firstStore.storeId || null,
          customer_name: customerName,
          customer_phone: phone,
          customer_address: deliveryType === 'delivery' ? address : 'Recoger en tienda (Pickup)',
          notes: reference || null,
          items: cartItems.map(i => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity, selectedVariant: i.selectedVariant || null })),
          total: total,
          status: 'pending',
          is_read: false
        }]).select().single();

        if (!error && data) orderUuid = data.id;
      }
    } catch (e) { console.warn(e); }

    let itemsText = cartItems.map(i => {
      const qty = parseInt(i.quantity, 10) || 1;
      const v = i.selectedVariant ? ` (${i.selectedVariant})` : '';
      return `• ${qty}x *${i.title}${v}* - Q${((parseFloat(i.price) || 0) * qty).toFixed(2)}`;
    }).join('\n');

    const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const trackingUrl = orderUuid ? `${baseUrl}rastreo.html?id=${orderUuid}` : '';

    let trackingMsg = trackingUrl ? `\n\n🔍 *RASTREA TU PEDIDO AQUÍ:*\n${trackingUrl}` : '';

    let msg = `Hola *${firstStore.storeName}*, quiero realizar el siguiente pedido desde *Pasaje de los Altos*:\n\n` +
              `📦 *PRODUCTOS:*\n${itemsText}\n\n` +
              `💰 *TOTAL:* Q ${total.toFixed(2)}\n\n` +
              `🚚 *MÉTODO:* ${deliveryType === 'delivery' ? '🛵 Envío a domicilio' : '🏪 Pickup'}\n` +
              (deliveryType === 'delivery' ? `📍 *DIRECCIÓN:* ${address}\n` : '') +
              trackingMsg;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  }

  function openDrawer() {
    buildCartUI();
    renderCartDrawer();
    const overlay = document.getElementById('cartDrawerOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay && drawer) {
      overlay.classList.remove('hidden');
      setTimeout(() => drawer.classList.remove('translate-x-full'), 10);
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    const overlay = document.getElementById('cartDrawerOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay && drawer) {
      drawer.classList.add('translate-x-full');
      setTimeout(() => { overlay.classList.add('hidden'); document.body.style.overflow = ''; }, 200);
    }
  }

  window.PasajeCart = { addToCart, removeFromCart, openDrawer, closeDrawer, getCart: () => cartItems.slice() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateCartBadge);
  else updateCartBadge();
})();