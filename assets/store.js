(function () {
  'use strict';

  var STORAGE_CART = 'subliStoreCartV2';
  var STORAGE_TOKEN = 'subliStoreTokenV2';
  var STATUS = {
    available: { label: 'Disponible', purchasable: true },
    limited: { label: 'Pocas disponibles', purchasable: true },
    on_request: { label: 'Bajo pedido', purchasable: true },
    paused: { label: 'No disponible', purchasable: false },
    maintenance: { label: 'Mantenimiento', purchasable: false }
  };
  var state = {
    token: localStorage.getItem(STORAGE_TOKEN) || '',
    cliente: null,
    catalog: null,
    cart: readCart(),
    category: 'all',
    query: '',
    selectedProductId: '',
    hashProductOpened: false
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function readCart() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
      return Array.isArray(value) ? value.slice(0, 20) : [];
    } catch (error) {
      return [];
    }
  }
  function saveCart() {
    localStorage.setItem(STORAGE_CART, JSON.stringify(state.cart));
  }
  function toast(message, type) {
    var node = document.createElement('div');
    node.className = 'store-toast ' + (type || '');
    node.textContent = message;
    byId('storeToastStack').appendChild(node);
    setTimeout(function () { node.remove(); }, 4300);
  }
  function formatPrice(value) {
    if (value === null || value === undefined || value === '') return 'Consultar';
    var settings = state.catalog && state.catalog.settings || {};
    return (settings.currencyLabel || 'Lps.') + ' ' + Number(value).toLocaleString(
      settings.locale || 'es-HN',
      { minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 }
    );
  }
  function statusOf(value) {
    return STATUS[value] || STATUS.available;
  }
  function categoryName(id) {
    var category = state.catalog && state.catalog.categories.find(function (item) { return item.id === id; });
    return category ? category.name : id;
  }
  function productById(id) {
    return state.catalog && state.catalog.products.find(function (product) { return product.id === id; });
  }
  function promoById(id) {
    return state.catalog && state.catalog.promotions.find(function (promotion) { return promotion.id === id; });
  }
  function visualContent(item) {
    return item.imageUrl
      ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.name || item.title) + '">'
      : '<b>' + escapeHtml(item.visual || (item.name || item.title || '').slice(0, 4).toUpperCase()) + '</b>';
  }
  function whatsappUrl(text) {
    var phone = state.catalog && state.catalog.settings.whatsapp || '50432126332';
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
  }

  async function api(url, options) {
    var response = await fetch(url, options);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) {
      var error = new Error(data.error || 'No se pudo completar la solicitud.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function authAction(action, payload) {
    return api('/api/store-auth', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        state.token ? { Authorization: 'Bearer ' + state.token } : {}
      ),
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
  }

  function setAuthTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-auth-tab') === tab);
    });
    byId('loginForm').classList.toggle('active', tab === 'login');
    byId('registerForm').classList.toggle('active', tab === 'register');
  }
  function showAuth(message) {
    byId('storeApp').hidden = true;
    byId('authGate').hidden = false;
    if (message) byId('loginMessage').textContent = message;
  }
  function showStore() {
    byId('authGate').hidden = true;
    byId('storeApp').hidden = false;
    renderClient();
    renderAll();
    openRequestedProduct();
  }
  function openRequestedProduct() {
    if (state.hashProductOpened || !state.catalog) return;
    var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    var productId = params.get('producto');
    if (!productId || !productById(productId)) return;
    state.hashProductOpened = true;
    setTimeout(function () { openProduct(productId); }, 0);
  }
  function renderClient() {
    if (!state.cliente) return;
    byId('clientPoints').textContent = state.cliente.puntos || 0;
    byId('clientAvatar').textContent = state.cliente.avatar || '🦊';
    byId('clientFirstName').textContent = state.cliente.nombre || 'Perfil';
    byId('profileFullName').textContent = state.cliente.fullName ||
      [state.cliente.nombre, state.cliente.apellido].filter(Boolean).join(' ');
    byId('profileEmail').textContent = state.cliente.correo || '';
  }

  async function loadCatalog() {
    var data = await api('/api/catalogo', { headers: { Accept: 'application/json' } });
    state.catalog = data.catalog;
    renderAll();
  }
  async function restoreSession() {
    if (!state.token) {
      showAuth('');
      return;
    }
    try {
      var data = await authAction('me');
      state.cliente = data.cliente;
      showStore();
    } catch (error) {
      localStorage.removeItem(STORAGE_TOKEN);
      state.token = '';
      state.cliente = null;
      showAuth('Su sesión venció. Ingrese nuevamente.');
    }
  }

  function renderCategories() {
    if (!state.catalog) return;
    var buttons = [{
      id: 'all',
      name: 'Todo',
      icon: '▦'
    }].concat(state.catalog.categories);
    byId('categoryFilters').innerHTML = buttons.map(function (category) {
      return '<button type="button" class="category-filter' +
        (state.category === category.id ? ' active' : '') +
        '" data-category="' + escapeHtml(category.id) + '">' +
        escapeHtml((category.icon || '') + ' ' + category.name) + '</button>';
    }).join('');
    byId('categoryFilters').querySelectorAll('[data-category]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.category = button.getAttribute('data-category');
        renderCategories();
        renderProducts();
      });
    });
  }

  function renderProducts() {
    if (!state.catalog) return;
    var query = state.query.toLowerCase();
    var products = state.catalog.products.filter(function (product) {
      if (!product.active || !product.storeEnabled || product.redemptionOnly) return false;
      if (state.category !== 'all' && product.categoryId !== state.category) return false;
      return !query || (product.name + ' ' + product.summary + ' ' + categoryName(product.categoryId))
        .toLowerCase().includes(query);
    });
    byId('emptyProducts').hidden = products.length > 0;
    byId('productGrid').innerHTML = products.map(function (product) {
      var price = productMinimumPrice(product);
      var status = statusOf(product.availability);
      var action = price === null && product.availability === 'on_request'
        ? '<a href="' + escapeHtml(whatsappUrl('Hola, quisiera consultar disponibilidad de ' + product.name)) +
          '" target="_blank" rel="noopener">Consultar</a>'
        : '<button type="button" data-view-product="' + escapeHtml(product.id) + '"' +
          (!status.purchasable ? ' disabled' : '') + '>Elegir plan</button>';
      return '<article class="product-card">' +
        '<div class="product-art" style="background:' + escapeHtml(product.accent || '#E2231A') + '">' +
          visualContent(product) + '</div>' +
        '<div class="product-body"><div class="product-topline"><span class="product-category">' +
          escapeHtml(categoryName(product.categoryId)) + '</span><span class="availability-pill availability-' +
          escapeHtml(product.availability) + '">' + escapeHtml(status.label) + '</span></div>' +
        '<h3>' + escapeHtml(product.name) + '</h3><p>' + escapeHtml(product.summary || '') + '</p>' +
        '<div class="product-bottom"><div class="product-price"><small>' +
          (price === null ? 'Precio' : 'Desde') + '</small><strong>' + escapeHtml(formatPrice(price)) +
          '</strong></div>' + action + '</div></div></article>';
    }).join('');
    byId('productGrid').querySelectorAll('[data-view-product]').forEach(function (button) {
      button.addEventListener('click', function () {
        openProduct(button.getAttribute('data-view-product'));
      });
    });
  }

  function productMinimumPrice(product) {
    var prices = [];
    (product.plans || []).filter(function (plan) { return plan.active; }).forEach(function (plan) {
      if (plan.price !== null && plan.price !== undefined) prices.push(Number(plan.price));
      (plan.options || []).forEach(function (option) {
        if (option.price !== null && option.price !== undefined) prices.push(Number(option.price));
      });
    });
    return prices.length ? Math.min.apply(Math, prices) : null;
  }

  function renderPromotions() {
    if (!state.catalog) return;
    var promotions = state.catalog.promotions || [];
    byId('promoSection').hidden = promotions.length === 0;
    byId('promoTrack').innerHTML = promotions.map(function (promotion) {
      var options = (promotion.options || []).map(function (option) {
        return '<option value="' + escapeHtml(option.id) + '">' + escapeHtml(option.label) +
          ' · ' + escapeHtml(formatPrice(option.price)) + (option.bonus ? ' · ' + escapeHtml(option.bonus) : '') +
          '</option>';
      }).join('');
      var first = promotion.options && promotion.options[0];
      return '<article class="promo-card" style="background:linear-gradient(145deg,' +
        escapeHtml(promotion.accent || '#E2231A') + ',#111218)" data-promo-card="' +
        escapeHtml(promotion.id) + '"><span class="eyebrow">OFERTA ACTIVA</span><h3>' +
        escapeHtml(promotion.title) + '</h3><p>' + escapeHtml(promotion.description || '') +
        '</p><div class="promo-card-footer"><label>Elija la opción<select data-promo-select>' +
        options + '</select></label><strong class="promo-card-price">' +
        escapeHtml(first ? formatPrice(first.price) : 'Consultar') +
        '</strong><button type="button" data-add-promo>Agregar</button></div></article>';
    }).join('');
    byId('promoTrack').querySelectorAll('[data-promo-card]').forEach(function (card) {
      var promotion = promoById(card.getAttribute('data-promo-card'));
      var select = card.querySelector('[data-promo-select]');
      var priceNode = card.querySelector('.promo-card-price');
      select.addEventListener('change', function () {
        var option = promotion.options.find(function (candidate) { return candidate.id === select.value; });
        priceNode.textContent = option ? formatPrice(option.price) : 'Consultar';
      });
      card.querySelector('[data-add-promo]').addEventListener('click', function () {
        addCartItem({ kind: 'promotion', promotionId: promotion.id, optionId: select.value, quantity: 1 });
      });
    });
  }

  function renderRewards() {
    if (!state.catalog) return;
    var rewards = [];
    state.catalog.products.forEach(function (product) {
      (product.plans || []).forEach(function (plan) {
        if (
          plan.active &&
          Number(plan.pointsCost) > 0 &&
          statusOf(product.availability).purchasable &&
          statusOf(plan.availability).purchasable
        ) rewards.push({ product: product, plan: plan });
      });
    });
    byId('rewardsSection').hidden = rewards.length === 0;
    byId('rewardGrid').innerHTML = rewards.map(function (reward) {
      var enough = state.cliente && Number(state.cliente.puntos) >= Number(reward.plan.pointsCost);
      var enabled = enough && statusOf(reward.product.availability).purchasable &&
        statusOf(reward.plan.availability).purchasable;
      return '<article class="reward-card"><span style="background:' +
        escapeHtml(reward.product.accent || '#E2231A') + '">' +
        escapeHtml(reward.product.visual || reward.product.name.slice(0, 2)) + '</span><div><strong>' +
        escapeHtml(reward.product.name) + '</strong><small>' +
        escapeHtml(reward.plan.name) + ' · ' + escapeHtml(reward.plan.pointsCost) +
        ' puntos</small></div><button type="button" data-redeem-product="' +
        escapeHtml(reward.product.id) + '" data-redeem-plan="' + escapeHtml(reward.plan.id) + '"' +
        (enabled ? '' : ' disabled') + '>' + (enough ? 'Canjear' : 'Faltan puntos') + '</button></article>';
    }).join('');
    byId('rewardGrid').querySelectorAll('[data-redeem-product]').forEach(function (button) {
      button.addEventListener('click', function () {
        redeem(button.getAttribute('data-redeem-product'), button.getAttribute('data-redeem-plan'), button);
      });
    });
  }

  function renderAll() {
    if (!state.catalog) return;
    renderCategories();
    renderProducts();
    renderPromotions();
    renderRewards();
    renderPaymentMethods();
    renderCart();
  }

  function openProduct(productId) {
    var product = productById(productId);
    if (!product) return;
    state.selectedProductId = productId;
    byId('productModalTitle').textContent = product.name;
    byId('productModalSummary').textContent = product.summary || '';
    byId('productModalStatus').textContent = statusOf(product.availability).label;
    byId('productModalStatus').className = 'availability-pill availability-' + product.availability;
    byId('productModalVisual').style.background = product.accent || '#E2231A';
    byId('productModalVisual').innerHTML = visualContent(product);
    var plans = (product.plans || []).filter(function (plan) { return plan.active; });
    byId('productPlanSelect').innerHTML = plans.map(function (plan) {
      return '<option value="' + escapeHtml(plan.id) + '">' + escapeHtml(plan.name) + '</option>';
    }).join('');
    updateProductSelection();
    openModal('productModal');
  }

  function updateProductSelection() {
    var product = productById(state.selectedProductId);
    if (!product) return;
    var plan = product.plans.find(function (candidate) {
      return candidate.id === byId('productPlanSelect').value;
    }) || product.plans.find(function (candidate) { return candidate.active; });
    if (!plan) return;
    var optionWrap = byId('productOptionWrap');
    optionWrap.hidden = !(plan.options && plan.options.length);
    if (plan.options && plan.options.length) {
      var previous = byId('productOptionSelect').value;
      byId('productOptionSelect').innerHTML = plan.options.map(function (option) {
        return '<option value="' + escapeHtml(option.id) + '">' + escapeHtml(option.label) +
          ' · ' + escapeHtml(formatPrice(option.price)) +
          (option.bonus ? ' · ' + escapeHtml(option.bonus) : '') + '</option>';
      }).join('');
      if (plan.options.some(function (option) { return option.id === previous; })) {
        byId('productOptionSelect').value = previous;
      }
    } else {
      byId('productOptionSelect').innerHTML = '';
    }
    var option = plan.options && plan.options.find(function (candidate) {
      return candidate.id === byId('productOptionSelect').value;
    });
    var price = option ? option.price : plan.price;
    var features = (product.productFeatures || []).concat(plan.features || []);
    byId('productFeatures').innerHTML = features.map(function (feature) {
      return '<li>' + escapeHtml(feature) + '</li>';
    }).join('');
    byId('productModalPrice').textContent = formatPrice(price) + (option ? '' : (plan.billingLabel || ''));
    var purchasable = statusOf(product.availability).purchasable &&
      statusOf(plan.availability).purchasable && price !== null;
    byId('addSelectedProduct').disabled = !purchasable;
    byId('addSelectedProduct').textContent = purchasable ? 'Agregar al carrito' : 'Consulte disponibilidad';
  }

  function selectedProductItem() {
    var product = productById(state.selectedProductId);
    if (!product) return null;
    var plan = product.plans.find(function (candidate) {
      return candidate.id === byId('productPlanSelect').value;
    });
    if (!plan) return null;
    var optionId = plan.options && plan.options.length ? byId('productOptionSelect').value : '';
    return { kind: 'product', productId: product.id, planId: plan.id, optionId: optionId, quantity: 1 };
  }

  function cartKey(item) {
    return item.kind === 'promotion'
      ? ['promotion', item.promotionId, item.optionId].join(':')
      : ['product', item.productId, item.planId, item.optionId || ''].join(':');
  }
  function addCartItem(item) {
    if (!resolveCartItem(item)) {
      toast('Esa opción ya no está disponible.', 'error');
      return;
    }
    var key = cartKey(item);
    if (state.cart.some(function (existing) { return cartKey(existing) === key; })) {
      toast('Ese plan ya está en su carrito.', '');
      openCart();
      return;
    }
    state.cart.push(item);
    saveCart();
    renderCart();
    toast('Producto agregado al carrito.', 'success');
  }

  function resolveCartItem(item) {
    if (!state.catalog || !item) return null;
    if (item.kind === 'promotion') {
      var promotion = promoById(item.promotionId);
      var promoOption = promotion && promotion.options.find(function (option) { return option.id === item.optionId; });
      if (!promotion || !promoOption || promoOption.price === null) return null;
      return {
        key: cartKey(item),
        kind: 'promotion',
        name: promotion.title,
        planName: promoOption.label,
        price: Number(promoOption.price),
        accent: promotion.accent || '#E2231A',
        visual: '%',
        productId: ''
      };
    }
    var product = productById(item.productId);
    var plan = product && product.plans.find(function (candidate) { return candidate.id === item.planId; });
    if (!product || !plan || !plan.active) return null;
    if (!statusOf(product.availability).purchasable || !statusOf(plan.availability).purchasable) return null;
    var option = item.optionId && plan.options
      ? plan.options.find(function (candidate) { return candidate.id === item.optionId; })
      : null;
    var price = option ? option.price : plan.price;
    if (price === null || price === undefined) return null;
    return {
      key: cartKey(item),
      kind: 'product',
      name: product.name,
      planName: option ? plan.name + ' · ' + option.label : plan.name,
      price: Number(price),
      accent: product.accent || '#E2231A',
      visual: product.visual || product.name.slice(0, 3),
      productId: product.id
    };
  }

  function cartSummary() {
    var resolved = state.cart.map(resolveCartItem).filter(Boolean);
    var subtotal = resolved.reduce(function (total, item) { return total + item.price; }, 0);
    var streaming = new Set();
    resolved.forEach(function (item) {
      var product = item.productId && productById(item.productId);
      if (product && product.categoryId === 'streaming') streaming.add(product.id);
    });
    var count = Math.min(
      Number(state.catalog.settings.maxComboItems) || 5,
      streaming.size
    );
    var rules = (state.catalog.settings.comboDiscounts || []).filter(function (rule) {
      return Number(rule.itemCount) <= count;
    }).sort(function (a, b) { return Number(b.itemCount) - Number(a.itemCount); });
    var discount = rules.length ? Math.min(subtotal, Number(rules[0].amount) || 0) : 0;
    return { items: resolved, subtotal: subtotal, discount: discount, total: subtotal - discount, streamingCount: count };
  }

  function renderCart() {
    if (!state.catalog) return;
    state.cart = state.cart.filter(function (item) { return Boolean(resolveCartItem(item)); });
    saveCart();
    var summary = cartSummary();
    byId('cartCount').textContent = summary.items.length;
    byId('cartItems').hidden = summary.items.length === 0;
    byId('cartEmpty').hidden = summary.items.length > 0;
    byId('cartItems').innerHTML = summary.items.map(function (item) {
      return '<article class="cart-item"><span class="cart-item-visual" style="background:' +
        escapeHtml(item.accent) + '">' + escapeHtml(item.visual) + '</span><span><strong>' +
        escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.planName) + '</small></span>' +
        '<span class="cart-item-price"><b>' + escapeHtml(formatPrice(item.price)) +
        '</b><button type="button" data-remove-cart="' + escapeHtml(item.key) + '">Quitar</button></span></article>';
    }).join('');
    byId('cartSubtotal').textContent = formatPrice(summary.subtotal);
    byId('cartDiscount').textContent = '- ' + formatPrice(summary.discount);
    byId('cartTotal').textContent = formatPrice(summary.total);
    byId('checkoutTotal').textContent = formatPrice(summary.total);
    byId('openCheckout').disabled = summary.items.length === 0;
    var nextRule = (state.catalog.settings.comboDiscounts || []).slice().sort(function (a, b) {
      return Number(a.itemCount) - Number(b.itemCount);
    }).find(function (rule) { return Number(rule.itemCount) > summary.streamingCount; });
    byId('comboHint').textContent = nextRule
      ? 'Agregue ' + (Number(nextRule.itemCount) - summary.streamingCount) +
        ' plataforma más para obtener Lps. ' + Number(nextRule.amount).toLocaleString('es-HN') + ' de descuento.'
      : (summary.discount ? 'Descuento de combo aplicado automáticamente.' : '');
    byId('cartItems').querySelectorAll('[data-remove-cart]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-remove-cart');
        state.cart = state.cart.filter(function (item) { return cartKey(item) !== key; });
        saveCart();
        renderCart();
      });
    });
  }

  function renderPaymentMethods() {
    if (!state.catalog) return;
    var methods = (state.catalog.settings.paymentMethods || []).filter(function (method) { return method.active; });
    byId('checkoutPayment').innerHTML = '<option value="">Seleccione</option>' + methods.map(function (method) {
      return '<option value="' + escapeHtml(method.id) + '">' + escapeHtml(method.name) + '</option>';
    }).join('');
    updatePaymentInstructions();
  }
  function updatePaymentInstructions() {
    if (!state.catalog) return;
    var method = (state.catalog.settings.paymentMethods || []).find(function (candidate) {
      return candidate.id === byId('checkoutPayment').value;
    });
    byId('paymentInstructions').textContent = method
      ? [method.instructions, method.accountName, method.accountNumber].filter(Boolean).join(' · ')
      : 'Seleccione un método para ver las instrucciones disponibles.';
  }

  async function redeem(productId, planId, button) {
    if (!state.token) return showAuth('Inicie sesión para canjear puntos.');
    button.disabled = true;
    button.textContent = 'Canjeando…';
    try {
      var data = await api('/api/canjear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token },
        body: JSON.stringify({ productId: productId, planId: planId })
      });
      state.cliente.puntos = data.puntos;
      renderClient();
      renderRewards();
      toast('Canje registrado. Un asesor gestionará su activación.', 'success');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Canjear';
      toast(error.message, 'error');
    }
  }

  function openCart() {
    byId('cartDrawer').classList.add('open');
    byId('cartDrawer').setAttribute('aria-hidden', 'false');
    byId('drawerBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    byId('cartDrawer').classList.remove('open');
    byId('cartDrawer').setAttribute('aria-hidden', 'true');
    byId('drawerBackdrop').hidden = true;
    document.body.style.overflow = '';
  }
  function openModal(id) {
    byId(id).hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    byId(id).hidden = true;
    document.body.style.overflow = '';
  }
  function closeStore() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ tipo: 'cerrar-substore' }, '*');
    } else {
      window.location.href = '/';
    }
  }

  function fileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve('');
      if (file.size > 5 * 1024 * 1024) return reject(new Error('El comprobante no debe superar 5 MB.'));
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('No se pudo leer el comprobante.')); };
      reader.readAsDataURL(file);
    });
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (!state.cart.length) return;
    var button = byId('submitCheckout');
    button.disabled = true;
    button.textContent = 'Validando precios…';
    byId('checkoutMessage').textContent = '';
    try {
      var method = (state.catalog.settings.paymentMethods || []).find(function (candidate) {
        return candidate.id === byId('checkoutPayment').value;
      });
      var receipt = await fileAsDataUrl(byId('checkoutReceipt').files[0]);
      var data = await api('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token },
        body: JSON.stringify({
          items: state.cart,
          device: byId('checkoutDevice').value,
          paymentMethod: method ? method.name : byId('checkoutPayment').value,
          notes: byId('checkoutNotes').value,
          receiptDataUrl: receipt
        })
      });
      state.cart = [];
      saveCart();
      renderCart();
      closeModal('checkoutModal');
      closeCart();
      byId('successMessage').textContent = data.message;
      byId('successPurchaseId').textContent = 'Pedido ' + data.purchaseId;
      openModal('successModal');
      byId('checkoutForm').reset();
      byId('receiptName').textContent = 'Seleccione una imagen';
      renderPaymentMethods();
    } catch (error) {
      byId('checkoutMessage').textContent = error.message;
      if (error.status === 409) {
        await loadCatalog().catch(function () {});
        renderCart();
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar pedido';
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-auth-tab]').forEach(function (button) {
      button.addEventListener('click', function () { setAuthTab(button.getAttribute('data-auth-tab')); });
    });
    document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = byId(button.getAttribute('data-toggle-password'));
        input.type = input.type === 'password' ? 'text' : 'password';
        button.textContent = input.type === 'password' ? 'Ver' : 'Ocultar';
      });
    });
    document.querySelectorAll('[data-close-store]').forEach(function (button) {
      button.addEventListener('click', closeStore);
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () { closeModal(button.getAttribute('data-close-modal')); });
    });
    byId('loginForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      byId('loginMessage').textContent = 'Verificando…';
      try {
        var data = await authAction('login', {
          email: byId('loginEmail').value,
          password: byId('loginPassword').value
        });
        state.token = data.token;
        state.cliente = data.cliente;
        localStorage.setItem(STORAGE_TOKEN, state.token);
        byId('loginPassword').value = '';
        byId('loginMessage').textContent = '';
        showStore();
      } catch (error) {
        byId('loginMessage').textContent = error.message;
      }
    });
    byId('registerForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      byId('registerMessage').textContent = 'Creando cuenta…';
      var rawPhone = byId('registerPhone').value.replace(/\D/g, '');
      var phone = rawPhone.indexOf('504') === 0 ? rawPhone : '504' + rawPhone;
      try {
        var data = await authAction('register', {
          fullName: byId('registerName').value,
          phone: phone,
          email: byId('registerEmail').value,
          birthDate: byId('registerBirthDate').value,
          password: byId('registerPassword').value
        });
        state.token = data.token;
        state.cliente = data.cliente;
        localStorage.setItem(STORAGE_TOKEN, state.token);
        byId('registerMessage').textContent = '';
        showStore();
      } catch (error) {
        byId('registerMessage').textContent = error.message;
      }
    });
    byId('logoutButton').addEventListener('click', async function () {
      await authAction('logout').catch(function () {});
      localStorage.removeItem(STORAGE_TOKEN);
      state.token = '';
      state.cliente = null;
      byId('profileMenu').hidden = true;
      showAuth('');
    });
    byId('profileButton').addEventListener('click', function () {
      byId('profileMenu').hidden = !byId('profileMenu').hidden;
    });
    byId('pointsButton').addEventListener('click', function () {
      byId('rewardsSection').scrollIntoView({ behavior: 'smooth' });
    });
    byId('exploreProducts').addEventListener('click', function () {
      byId('catalogSection').scrollIntoView({ behavior: 'smooth' });
    });
    byId('storeSearch').addEventListener('input', function (event) {
      state.query = event.target.value.trim();
      renderProducts();
    });
    byId('promoPrev').addEventListener('click', function () {
      byId('promoTrack').scrollBy({ left: -380, behavior: 'smooth' });
    });
    byId('promoNext').addEventListener('click', function () {
      byId('promoTrack').scrollBy({ left: 380, behavior: 'smooth' });
    });
    byId('productPlanSelect').addEventListener('change', updateProductSelection);
    byId('productOptionSelect').addEventListener('change', updateProductSelection);
    byId('addSelectedProduct').addEventListener('click', function () {
      var item = selectedProductItem();
      if (item) {
        addCartItem(item);
        closeModal('productModal');
        openCart();
      }
    });
    byId('openCart').addEventListener('click', openCart);
    byId('closeCart').addEventListener('click', closeCart);
    byId('drawerBackdrop').addEventListener('click', closeCart);
    byId('openCheckout').addEventListener('click', function () {
      if (!state.cart.length) return;
      closeCart();
      openModal('checkoutModal');
      byId('checkoutTotal').textContent = formatPrice(cartSummary().total);
    });
    byId('checkoutPayment').addEventListener('change', updatePaymentInstructions);
    byId('checkoutReceipt').addEventListener('change', function () {
      var file = byId('checkoutReceipt').files[0];
      byId('receiptName').textContent = file ? file.name : 'Seleccione una imagen';
    });
    byId('checkoutForm').addEventListener('submit', submitCheckout);
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      ['productModal', 'checkoutModal', 'successModal'].forEach(function (id) {
        if (!byId(id).hidden) closeModal(id);
      });
      closeCart();
    });
  }

  async function boot() {
    bindEvents();
    try {
      await loadCatalog();
      await restoreSession();
    } catch (error) {
      showAuth('No se pudo cargar SubliStore: ' + error.message);
    }
  }

  boot();
})();
