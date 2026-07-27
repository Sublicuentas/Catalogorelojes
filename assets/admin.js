(function () {
  'use strict';

  var state = {
    token: sessionStorage.getItem('subliAdminToken') || '',
    user: sessionStorage.getItem('subliAdminUser') || '',
    catalog: null,
    selectedProductId: '',
    selectedPromotionId: '',
    selectedClientId: '',
    orders: [],
    clients: [],
    dirty: false,
    currentView: 'products'
  };

  var STATUS = {
    available: 'Disponible',
    limited: 'Pocas disponibles',
    on_request: 'Bajo pedido',
    paused: 'No disponible',
    maintenance: 'Mantenimiento'
  };

  var TITLES = {
    orders: 'Pedidos de SubliStore',
    clients: 'Clientes y puntos',
    products: 'Productos y precios',
    promotions: 'Promociones programadas',
    availability: 'Disponibilidad',
    settings: 'Configuración general',
    history: 'Historial de publicaciones'
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function slug(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function numberValue(value) {
    if (value === '' || value === null || value === undefined) return null;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function statusOptions(selected) {
    return Object.keys(STATUS).map(function (key) {
      return '<option value="' + key + '"' + (selected === key ? ' selected' : '') + '>' +
        escapeHtml(STATUS[key]) + '</option>';
    }).join('');
  }
  function categoryName(id) {
    var category = state.catalog && state.catalog.categories.find(function (item) { return item.id === id; });
    return category ? category.name : id;
  }
  function formatPrice(value) {
    if (value === null || value === undefined || value === '') return 'Consultar';
    return 'Lps. ' + Number(value).toLocaleString('es-HN', { maximumFractionDigits: 2 });
  }
  function visualMarkup(item, className) {
    var body = item.imageUrl
      ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="">'
      : escapeHtml(item.visual || item.name.slice(0, 2).toUpperCase());
    return '<span class="' + (className || 'item-visual') + '" style="background:' +
      escapeHtml(item.accent || '#E2231A') + '">' + body + '</span>';
  }
  function firstPrice(product) {
    var prices = [];
    (product.plans || []).forEach(function (plan) {
      if (plan.price !== null && plan.price !== undefined) prices.push(Number(plan.price));
      (plan.options || []).forEach(function (option) {
        if (option.price !== null && option.price !== undefined) prices.push(Number(option.price));
      });
    });
    return prices.length ? Math.min.apply(Math, prices) : null;
  }
  function toast(message, type) {
    var node = document.createElement('div');
    node.className = 'toast ' + (type || '');
    node.textContent = message;
    byId('toastStack').appendChild(node);
    setTimeout(function () { node.remove(); }, 4200);
  }
  function setDirty(value) {
    state.dirty = value !== false;
    var node = byId('adminSaveState');
    node.textContent = state.dirty ? 'Cambios sin publicar' : 'Todo publicado';
    node.classList.toggle('dirty', state.dirty);
  }

  async function request(action, payload) {
    var response = await fetch('/api/admin-catalogo', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        state.token ? { Authorization: 'Bearer ' + state.token } : {}
      ),
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) {
      var error = new Error(data.error || 'No se pudo completar la operación.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showLogin(message) {
    byId('adminShell').hidden = true;
    byId('adminLogin').hidden = false;
    if (message) byId('adminLoginMessage').textContent = message;
  }
  function showApp() {
    byId('adminLogin').hidden = true;
    byId('adminShell').hidden = false;
  }

  async function loadCatalog() {
    try {
      var data = await request('load');
      state.catalog = data.catalog;
      state.selectedProductId = state.catalog.products[0] ? state.catalog.products[0].id : '';
      state.selectedPromotionId = state.catalog.promotions[0] ? state.catalog.promotions[0].id : '';
      showApp();
      byId('adminNotice').hidden = !data.warning;
      byId('adminNotice').textContent = data.warning || '';
      setDirty(false);
      renderAll();
    } catch (error) {
      if (error.status === 401) {
        sessionStorage.removeItem('subliAdminToken');
        state.token = '';
        showLogin('Su sesión venció. Ingrese nuevamente.');
      } else {
        showLogin(error.message);
      }
    }
  }

  function renderStats() {
    var activeProducts = state.catalog.products.filter(function (product) { return product.active; }).length;
    var activePromotions = state.catalog.promotions.filter(function (promotion) { return promotion.active; }).length;
    var pending = state.catalog.products.filter(function (product) {
      return product.availability !== 'available';
    }).length;
    byId('statProducts').textContent = activeProducts;
    byId('statPromos').textContent = activePromotions;
    byId('statPending').textContent = pending;
    byId('statVersion').textContent = state.catalog.catalogVersion || 1;
  }

  function renderCategoryFilter() {
    var select = byId('productCategoryFilter');
    var current = select.value;
    select.innerHTML = '<option value="">Todas las categorías</option>' +
      state.catalog.categories.map(function (category) {
        return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.name) + '</option>';
      }).join('');
    select.value = current;
  }

  function renderProductList() {
    var query = byId('productSearch').value.trim().toLowerCase();
    var category = byId('productCategoryFilter').value;
    var products = state.catalog.products.slice().sort(function (a, b) {
      if (a.categoryId !== b.categoryId) return categoryName(a.categoryId).localeCompare(categoryName(b.categoryId));
      return Number(a.order || 0) - Number(b.order || 0);
    }).filter(function (product) {
      var matchesQuery = !query || (product.name + ' ' + categoryName(product.categoryId)).toLowerCase().includes(query);
      return matchesQuery && (!category || product.categoryId === category);
    });
    byId('productList').innerHTML = products.length ? products.map(function (product) {
      return '<button type="button" class="list-item' +
        (state.selectedProductId === product.id ? ' active' : '') +
        '" data-product-id="' + escapeHtml(product.id) + '">' +
        visualMarkup(product) +
        '<span><strong>' + escapeHtml(product.name) + '</strong><small>' +
        escapeHtml(categoryName(product.categoryId)) + ' · ' + escapeHtml(formatPrice(firstPrice(product))) +
        (product.active ? '' : ' · Archivado') + '</small></span>' +
        '<em class="item-status status-' + escapeHtml(product.availability) + '">' +
        escapeHtml(STATUS[product.availability] || product.availability) + '</em></button>';
    }).join('') : '<div class="empty-list">No se encontraron productos.</div>';

    byId('productList').querySelectorAll('[data-product-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedProductId = button.getAttribute('data-product-id');
        renderProductList();
        renderProductEditor();
      });
    });
  }

  function productById(id) {
    return state.catalog.products.find(function (product) { return product.id === id; });
  }

  function renderProductEditor() {
    var product = productById(state.selectedProductId);
    if (!product) {
      byId('productEditor').innerHTML = '<div class="empty-editor"><span>▦</span><h3>Seleccione un producto</h3></div>';
      return;
    }
    var categoryOptions = state.catalog.categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '"' +
        (product.categoryId === category.id ? ' selected' : '') + '>' +
        escapeHtml(category.name) + '</option>';
    }).join('');
    var plans = (product.plans || []).map(function (plan, planIndex) {
      var options = (plan.options || []).map(function (option, optionIndex) {
        return '<div class="option-row" data-option-row="' + optionIndex + '">' +
          '<input data-option-field="label" value="' + escapeHtml(option.label) + '" placeholder="Duración u opción">' +
          '<input data-option-field="price" type="number" min="0" step="0.01" value="' +
          escapeHtml(option.price === null ? '' : option.price) + '" placeholder="Precio">' +
          '<input data-option-field="bonus" value="' + escapeHtml(option.bonus || '') + '" placeholder="Beneficio opcional">' +
          '<button type="button" data-remove-option="' + optionIndex + '" aria-label="Quitar opción">×</button></div>';
      }).join('');
      return '<article class="plan-card" data-plan-card="' + planIndex + '">' +
        '<div class="plan-title"><strong>' + escapeHtml(plan.name) + '</strong>' +
        '<button type="button" data-remove-plan="' + planIndex + '">Archivar plan</button></div>' +
        '<div class="plan-grid">' +
          '<label>Nombre<input data-plan-field="name" value="' + escapeHtml(plan.name) + '"></label>' +
          '<label>Precio base<input data-plan-field="price" type="number" min="0" step="0.01" value="' +
            escapeHtml(plan.price === null ? '' : plan.price) + '"></label>' +
          '<label>Periodo<input data-plan-field="billingLabel" value="' + escapeHtml(plan.billingLabel || '') + '" placeholder="/mes"></label>' +
          '<label>Estado<select data-plan-field="availability">' + statusOptions(plan.availability) + '</select></label>' +
          '<label>Puntos de canje<input data-plan-field="pointsCost" type="number" min="0" value="' +
            escapeHtml(plan.pointsCost === null ? '' : plan.pointsCost) + '"></label>' +
          '<label>Etiqueta<input data-plan-field="badge" value="' + escapeHtml(plan.badge || '') + '" placeholder="Popular"></label>' +
        '</div>' +
        '<label class="switch-line"><input class="switch" type="checkbox" data-plan-field="active"' +
          (plan.active ? ' checked' : '') + '>Plan activo</label>' +
        '<label class="field feature-editor">Características, una por línea<textarea data-plan-field="features">' +
          escapeHtml((plan.features || []).join('\n')) + '</textarea></label>' +
        '<div class="option-table">' + options + '</div>' +
        '<button type="button" class="add-option" data-add-option="' + planIndex + '">+ Agregar duración u opción</button>' +
      '</article>';
    }).join('');

    byId('productEditor').innerHTML =
      '<div class="editor-head">' + visualMarkup(product) +
        '<div><h2>' + escapeHtml(product.name) + '</h2><p>ID: ' + escapeHtml(product.id) + '</p></div>' +
        '<div class="editor-head-actions"><button type="button" class="danger" id="archiveProduct">' +
        (product.active ? 'Archivar' : 'Reactivar') + '</button></div></div>' +
      '<div class="field-grid">' +
        '<label class="field">Nombre<input id="peName" value="' + escapeHtml(product.name) + '"></label>' +
        '<label class="field">Categoría<select id="peCategory">' + categoryOptions + '</select></label>' +
        '<label class="field">Disponibilidad<select id="peAvailability">' + statusOptions(product.availability) + '</select></label>' +
        '<label class="field">Orden<input id="peOrder" type="number" value="' + escapeHtml(product.order || 0) + '"></label>' +
        '<label class="field">Color<input id="peAccent" type="color" value="' + escapeHtml(product.accent || '#E2231A') + '"></label>' +
        '<label class="field">Texto corto del ícono<input id="peVisual" value="' + escapeHtml(product.visual || '') + '"></label>' +
        '<label class="field full">Descripción<textarea id="peSummary">' + escapeHtml(product.summary || '') + '</textarea></label>' +
        '<label class="field full">URL de imagen optimizada<input id="peImage" type="url" value="' +
          escapeHtml(product.imageUrl || '') + '" placeholder="https://.../imagen.webp"></label>' +
        '<div class="image-preview full" id="peImagePreview">' +
          (product.imageUrl ? '<img src="' + escapeHtml(product.imageUrl) + '" alt="Vista previa">' : 'Sin imagen externa') +
        '</div>' +
      '</div>' +
      '<div class="field-grid">' +
        '<label class="switch-line"><input class="switch" type="checkbox" id="peActive"' +
          (product.active ? ' checked' : '') + '>Producto activo</label>' +
        '<label class="switch-line"><input class="switch" type="checkbox" id="peStoreEnabled"' +
          (product.storeEnabled ? ' checked' : '') + '>Visible en SubliStore</label>' +
      '</div>' +
      '<div class="section-title"><h3>Planes y precios</h3><button type="button" class="secondary" id="addPlan">+ Plan</button></div>' +
      '<div id="plansEditor">' + plans + '</div>';

    function bindValue(id, field, parser) {
      byId(id).addEventListener('input', function (event) {
        product[field] = parser ? parser(event.target.value) : event.target.value;
        setDirty();
        if (field === 'imageUrl') {
          byId('peImagePreview').innerHTML = product.imageUrl
            ? '<img src="' + escapeHtml(product.imageUrl) + '" alt="Vista previa">'
            : 'Sin imagen externa';
        }
      });
      byId(id).addEventListener('change', function () {
        renderProductList();
        renderStats();
      });
    }
    bindValue('peName', 'name');
    bindValue('peCategory', 'categoryId');
    bindValue('peAvailability', 'availability');
    bindValue('peOrder', 'order', function (value) { return Number(value) || 0; });
    bindValue('peAccent', 'accent');
    bindValue('peVisual', 'visual');
    bindValue('peSummary', 'summary');
    bindValue('peImage', 'imageUrl');
    byId('peActive').addEventListener('change', function (event) {
      product.active = event.target.checked; setDirty(); renderProductList(); renderStats();
    });
    byId('peStoreEnabled').addEventListener('change', function (event) {
      product.storeEnabled = event.target.checked; setDirty();
    });
    byId('archiveProduct').addEventListener('click', function () {
      product.active = !product.active;
      setDirty();
      renderProductList();
      renderProductEditor();
      renderStats();
    });
    byId('addPlan').addEventListener('click', function () {
      product.plans.push({
        id: 'plan-' + Date.now(),
        name: 'Nuevo plan',
        price: null,
        billingLabel: '/mes',
        active: true,
        availability: 'available',
        badge: '',
        pointsCost: null,
        features: [],
        options: []
      });
      setDirty();
      renderProductEditor();
    });

    byId('plansEditor').querySelectorAll('[data-plan-card]').forEach(function (card) {
      var planIndex = Number(card.getAttribute('data-plan-card'));
      var plan = product.plans[planIndex];
      card.querySelectorAll('[data-plan-field]').forEach(function (input) {
        var field = input.getAttribute('data-plan-field');
        var handler = function () {
          if (field === 'active') plan[field] = input.checked;
          else if (field === 'price' || field === 'pointsCost') plan[field] = numberValue(input.value);
          else if (field === 'features') plan[field] = input.value.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
          else plan[field] = input.value;
          if (field === 'name') card.querySelector('.plan-title strong').textContent = plan.name;
          setDirty();
          renderProductList();
        };
        input.addEventListener(input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input', handler);
      });
      card.querySelectorAll('[data-option-row]').forEach(function (row) {
        var optionIndex = Number(row.getAttribute('data-option-row'));
        var option = plan.options[optionIndex];
        row.querySelectorAll('[data-option-field]').forEach(function (input) {
          input.addEventListener('input', function () {
            var field = input.getAttribute('data-option-field');
            option[field] = field === 'price' ? numberValue(input.value) : input.value;
            setDirty();
            renderProductList();
          });
        });
      });
    });
    byId('plansEditor').querySelectorAll('[data-remove-plan]').forEach(function (button) {
      button.addEventListener('click', function () {
        var index = Number(button.getAttribute('data-remove-plan'));
        product.plans[index].active = false;
        product.plans[index].availability = 'paused';
        setDirty();
        renderProductEditor();
      });
    });
    byId('plansEditor').querySelectorAll('[data-add-option]').forEach(function (button) {
      button.addEventListener('click', function () {
        var index = Number(button.getAttribute('data-add-option'));
        product.plans[index].options.push({
          id: 'option-' + Date.now(),
          label: 'Nueva opción',
          price: product.plans[index].price,
          bonus: ''
        });
        setDirty();
        renderProductEditor();
      });
    });
    byId('plansEditor').querySelectorAll('[data-remove-option]').forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('[data-plan-card]');
        var planIndex = Number(card.getAttribute('data-plan-card'));
        var optionIndex = Number(button.getAttribute('data-remove-option'));
        product.plans[planIndex].options.splice(optionIndex, 1);
        setDirty();
        renderProductEditor();
      });
    });
  }

  function renderPromotionList() {
    var promotions = state.catalog.promotions.slice().sort(function (a, b) {
      return Number(a.order || 0) - Number(b.order || 0);
    });
    byId('promotionList').innerHTML = promotions.length ? promotions.map(function (promotion) {
      var price = promotion.options && promotion.options[0] ? promotion.options[0].price : null;
      return '<button type="button" class="list-item' +
        (state.selectedPromotionId === promotion.id ? ' active' : '') +
        '" data-promotion-id="' + escapeHtml(promotion.id) + '">' +
        '<span class="item-visual" style="background:' + escapeHtml(promotion.accent || '#E2231A') + '">%</span>' +
        '<span><strong>' + escapeHtml(promotion.title) + '</strong><small>' +
        escapeHtml(formatPrice(price)) + (promotion.endsAt ? ' · Hasta ' + escapeHtml(promotion.endsAt.slice(0, 10)) : '') +
        '</small></span><em class="item-status ' +
        (promotion.active ? 'status-available' : 'status-paused') + '">' +
        (promotion.active ? 'Activa' : 'Pausada') + '</em></button>';
    }).join('') : '<div class="empty-list">No hay promociones.</div>';
    byId('promotionList').querySelectorAll('[data-promotion-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedPromotionId = button.getAttribute('data-promotion-id');
        renderPromotionList();
        renderPromotionEditor();
      });
    });
  }

  function promotionById(id) {
    return state.catalog.promotions.find(function (promotion) { return promotion.id === id; });
  }
  function dateTimeValue(value) {
    return value ? String(value).slice(0, 16) : '';
  }
  function isoValue(value) {
    if (!value) return '';
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function renderPromotionEditor() {
    var promotion = promotionById(state.selectedPromotionId);
    if (!promotion) {
      byId('promotionEditor').innerHTML = '<div class="empty-editor"><span>◇</span><h3>Seleccione una promoción</h3></div>';
      return;
    }
    var products = state.catalog.products.filter(function (product) { return product.active; }).map(function (product) {
      return '<label class="switch-line"><input class="switch" type="checkbox" data-promo-product="' +
        escapeHtml(product.id) + '"' + ((promotion.productIds || []).includes(product.id) ? ' checked' : '') +
        '>' + escapeHtml(product.name) + '</label>';
    }).join('');
    var options = (promotion.options || []).map(function (option, index) {
      return '<div class="option-row" data-promo-option="' + index + '">' +
        '<input data-promo-option-field="label" value="' + escapeHtml(option.label) + '" placeholder="Duración">' +
        '<input data-promo-option-field="price" type="number" min="0" step="0.01" value="' +
          escapeHtml(option.price === null ? '' : option.price) + '">' +
        '<input data-promo-option-field="bonus" value="' + escapeHtml(option.bonus || '') + '" placeholder="Beneficio">' +
        '<button type="button" data-remove-promo-option="' + index + '">×</button></div>';
    }).join('');
    byId('promotionEditor').innerHTML =
      '<div class="editor-head"><span class="item-visual" style="background:' +
        escapeHtml(promotion.accent || '#E2231A') + '">%</span><div><h2>' +
        escapeHtml(promotion.title) + '</h2><p>ID: ' + escapeHtml(promotion.id) + '</p></div>' +
        '<div class="editor-head-actions"><button type="button" class="danger" id="archivePromotion">' +
        (promotion.active ? 'Pausar' : 'Activar') + '</button></div></div>' +
      '<div class="field-grid">' +
        '<label class="field full">Título<input id="prTitle" value="' + escapeHtml(promotion.title) + '"></label>' +
        '<label class="field full">Descripción<textarea id="prDescription">' + escapeHtml(promotion.description || '') + '</textarea></label>' +
        '<label class="field">Inicio<input id="prStarts" type="datetime-local" value="' + escapeHtml(dateTimeValue(promotion.startsAt)) + '"></label>' +
        '<label class="field">Final<input id="prEnds" type="datetime-local" value="' + escapeHtml(dateTimeValue(promotion.endsAt)) + '"></label>' +
        '<label class="field">Color<input id="prAccent" type="color" value="' + escapeHtml(promotion.accent || '#E2231A') + '"></label>' +
        '<label class="field">Orden<input id="prOrder" type="number" value="' + escapeHtml(promotion.order || 0) + '"></label>' +
        '<label class="field full">Beneficios, uno por línea<textarea id="prFeatures">' +
          escapeHtml((promotion.features || []).join('\n')) + '</textarea></label>' +
      '</div>' +
      '<label class="switch-line"><input class="switch" type="checkbox" id="prActive"' +
        (promotion.active ? ' checked' : '') + '>Promoción activa</label>' +
      '<div class="section-title"><h3>Precios promocionales</h3><button type="button" class="secondary" id="addPromoOption">+ Opción</button></div>' +
      '<div id="promoOptions">' + options + '</div>' +
      '<div class="section-title"><h3>Servicios incluidos</h3></div><div class="field-grid">' + products + '</div>';

    [
      ['prTitle', 'title', function (value) { return value; }],
      ['prDescription', 'description', function (value) { return value; }],
      ['prStarts', 'startsAt', isoValue],
      ['prEnds', 'endsAt', isoValue],
      ['prAccent', 'accent', function (value) { return value; }],
      ['prOrder', 'order', function (value) { return Number(value) || 0; }],
      ['prFeatures', 'features', function (value) {
        return value.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
      }]
    ].forEach(function (binding) {
      byId(binding[0]).addEventListener('input', function (event) {
        promotion[binding[1]] = binding[2](event.target.value);
        setDirty();
        if (binding[1] === 'title') renderPromotionList();
      });
    });
    byId('prActive').addEventListener('change', function (event) {
      promotion.active = event.target.checked; setDirty(); renderPromotionList(); renderStats();
    });
    byId('archivePromotion').addEventListener('click', function () {
      promotion.active = !promotion.active; setDirty(); renderPromotionList(); renderPromotionEditor(); renderStats();
    });
    byId('addPromoOption').addEventListener('click', function () {
      promotion.options.push({ id: 'option-' + Date.now(), label: 'Nueva opción', price: null, bonus: '' });
      setDirty(); renderPromotionEditor();
    });
    byId('promoOptions').querySelectorAll('[data-promo-option]').forEach(function (row) {
      var index = Number(row.getAttribute('data-promo-option'));
      var option = promotion.options[index];
      row.querySelectorAll('[data-promo-option-field]').forEach(function (input) {
        input.addEventListener('input', function () {
          var field = input.getAttribute('data-promo-option-field');
          option[field] = field === 'price' ? numberValue(input.value) : input.value;
          setDirty(); renderPromotionList();
        });
      });
    });
    byId('promoOptions').querySelectorAll('[data-remove-promo-option]').forEach(function (button) {
      button.addEventListener('click', function () {
        promotion.options.splice(Number(button.getAttribute('data-remove-promo-option')), 1);
        setDirty(); renderPromotionEditor();
      });
    });
    byId('promotionEditor').querySelectorAll('[data-promo-product]').forEach(function (input) {
      input.addEventListener('change', function () {
        var id = input.getAttribute('data-promo-product');
        var selected = new Set(promotion.productIds || []);
        if (input.checked) selected.add(id); else selected.delete(id);
        promotion.productIds = Array.from(selected);
        setDirty();
      });
    });
  }

  function renderAvailability() {
    var products = state.catalog.products.slice().sort(function (a, b) {
      return categoryName(a.categoryId).localeCompare(categoryName(b.categoryId)) ||
        Number(a.order || 0) - Number(b.order || 0);
    });
    byId('availabilityList').innerHTML = products.map(function (product) {
      return '<div class="availability-row" data-availability-product="' + escapeHtml(product.id) + '">' +
        visualMarkup(product) +
        '<span><strong>' + escapeHtml(product.name) + '</strong><small>' +
        escapeHtml(categoryName(product.categoryId)) + ' · ' + (product.plans || []).length + ' planes</small></span>' +
        '<select data-availability-select>' + statusOptions(product.availability) + '</select>' +
        '<label class="switch-line"><input class="switch" type="checkbox" data-availability-active' +
          (product.active ? ' checked' : '') + '>Activo</label></div>';
    }).join('');
    byId('availabilityList').querySelectorAll('[data-availability-product]').forEach(function (row) {
      var product = productById(row.getAttribute('data-availability-product'));
      row.querySelector('[data-availability-select]').addEventListener('change', function (event) {
        product.availability = event.target.value;
        product.plans.forEach(function (plan) {
          if (plan.availability !== 'paused' || event.target.value === 'paused') {
            plan.availability = event.target.value;
          }
        });
        setDirty(); renderProductList(); renderStats();
      });
      row.querySelector('[data-availability-active]').addEventListener('change', function (event) {
        product.active = event.target.checked;
        setDirty(); renderProductList(); renderStats();
      });
    });
  }

  function renderSettings() {
    var settings = state.catalog.settings;
    var discounts = (settings.comboDiscounts || []).map(function (discount, index) {
      return '<div class="option-row" data-discount-index="' + index + '">' +
        '<input data-discount-field="itemCount" type="number" min="2" max="5" value="' + escapeHtml(discount.itemCount) + '">' +
        '<input data-discount-field="amount" type="number" min="0" value="' + escapeHtml(discount.amount) + '">' +
        '<input value="Descuento por cantidad de plataformas" disabled>' +
        '<button type="button" data-remove-discount="' + index + '">×</button></div>';
    }).join('');
    var payments = (settings.paymentMethods || []).map(function (method, index) {
      return '<div class="payment-row" data-payment-index="' + index + '">' +
        '<input data-payment-field="name" value="' + escapeHtml(method.name) + '" placeholder="Método">' +
        '<input data-payment-field="accountName" value="' + escapeHtml(method.accountName || '') + '" placeholder="Titular o banco">' +
        '<input data-payment-field="accountNumber" value="' + escapeHtml(method.accountNumber || '') + '" placeholder="Cuenta o número">' +
        '<label class="switch-line"><input class="switch" type="checkbox" data-payment-field="active"' +
          (method.active ? ' checked' : '') + '></label>' +
        '<textarea data-payment-field="instructions" placeholder="Instrucciones que verá el cliente">' +
          escapeHtml(method.instructions || '') + '</textarea></div>';
    }).join('');
    byId('settingsEditor').innerHTML =
      '<div class="settings-section"><h2>Marca y contacto</h2><p>Datos utilizados por el catálogo, SubliStore y los mensajes de compra.</p>' +
        '<div class="field-grid">' +
          '<label class="field">Marca<input id="seBrand" value="' + escapeHtml(settings.brand || '') + '"></label>' +
          '<label class="field">WhatsApp<input id="seWhatsapp" inputmode="numeric" value="' + escapeHtml(settings.whatsapp || '') + '"></label>' +
          '<label class="field full">Eslogan<input id="seSlogan" value="' + escapeHtml(settings.slogan || '') + '"></label>' +
          '<label class="field">Puntos por compra confirmada<input id="sePoints" type="number" min="0" value="' +
            escapeHtml(settings.pointsPerConfirmedPurchase || 0) + '"></label>' +
          '<label class="field">Máximo de plataformas por combo<input id="seMaxCombo" type="number" min="2" max="5" value="' +
            escapeHtml(settings.maxComboItems || 5) + '"></label>' +
        '</div></div>' +
      '<div class="settings-section"><div class="section-title"><h3>Descuentos por combo</h3><button class="secondary" id="addDiscount" type="button">+ Regla</button></div>' +
        '<p>Se aplica la regla más alta alcanzada, sin inventar descuentos adicionales.</p><div id="discountRows">' + discounts + '</div></div>' +
      '<div class="settings-section"><div class="section-title"><h3>Métodos de pago</h3><button class="secondary" id="addPayment" type="button">+ Método</button></div>' +
        '<p>Los datos solo se muestran si el método está activo.</p><div id="paymentRows">' + payments + '</div></div>';

    [
      ['seBrand', 'brand', function (value) { return value; }],
      ['seWhatsapp', 'whatsapp', function (value) { return value.replace(/\D/g, ''); }],
      ['seSlogan', 'slogan', function (value) { return value; }],
      ['sePoints', 'pointsPerConfirmedPurchase', function (value) { return Number(value) || 0; }],
      ['seMaxCombo', 'maxComboItems', function (value) { return Math.max(2, Math.min(5, Number(value) || 5)); }]
    ].forEach(function (binding) {
      byId(binding[0]).addEventListener('input', function (event) {
        settings[binding[1]] = binding[2](event.target.value); setDirty();
      });
    });
    byId('addDiscount').addEventListener('click', function () {
      settings.comboDiscounts.push({ itemCount: 2, amount: 0 });
      setDirty(); renderSettings();
    });
    byId('discountRows').querySelectorAll('[data-discount-index]').forEach(function (row) {
      var index = Number(row.getAttribute('data-discount-index'));
      row.querySelectorAll('[data-discount-field]').forEach(function (input) {
        input.addEventListener('input', function () {
          settings.comboDiscounts[index][input.getAttribute('data-discount-field')] = Number(input.value) || 0;
          setDirty();
        });
      });
    });
    byId('discountRows').querySelectorAll('[data-remove-discount]').forEach(function (button) {
      button.addEventListener('click', function () {
        settings.comboDiscounts.splice(Number(button.getAttribute('data-remove-discount')), 1);
        setDirty(); renderSettings();
      });
    });
    byId('addPayment').addEventListener('click', function () {
      settings.paymentMethods.push({
        id: 'payment-' + Date.now(),
        name: 'Nuevo método',
        active: true,
        instructions: '',
        accountName: '',
        accountNumber: ''
      });
      setDirty(); renderSettings();
    });
    byId('paymentRows').querySelectorAll('[data-payment-index]').forEach(function (row) {
      var index = Number(row.getAttribute('data-payment-index'));
      row.querySelectorAll('[data-payment-field]').forEach(function (input) {
        var eventName = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(eventName, function () {
          var field = input.getAttribute('data-payment-field');
          settings.paymentMethods[index][field] = input.type === 'checkbox' ? input.checked : input.value;
          setDirty();
        });
      });
    });
  }

  function formatDate(value) {
    if (!value) return 'Fecha pendiente';
    var date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Fecha pendiente'
      : date.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function orderStatusLabel(value) {
    return {
      pendiente: 'Pendiente',
      confirmada: 'Confirmado',
      cancelada: 'Cancelado'
    }[value] || value || 'Pendiente';
  }

  function renderOrdersList() {
    var filter = byId('orderStatusFilter').value;
    var orders = state.orders.filter(function (order) {
      return !filter || order.estado === filter;
    });
    byId('ordersList').innerHTML = orders.length ? orders.map(function (order) {
      var items = (order.items || []).map(function (item) {
        return '<div class="order-item"><span>' + escapeHtml(item.name) + ' · ' +
          escapeHtml(item.planName) + ' ×' + escapeHtml(item.quantity || 1) + '</span><b>' +
          escapeHtml(formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))) +
          '</b></div>';
      }).join('');
      var actions = order.estado === 'pendiente'
        ? '<div class="order-actions"><button type="button" class="danger" data-cancel-order="' +
          escapeHtml(order.id) + '">Cancelar</button><button type="button" class="primary" data-confirm-order="' +
          escapeHtml(order.id) + '">Confirmar pago y puntos</button></div>'
        : '';
      var contact = order.clienteTelefono
        ? '<a href="https://wa.me/' + escapeHtml(String(order.clienteTelefono).replace(/\D/g, '')) +
          '" target="_blank" rel="noopener">+' + escapeHtml(order.clienteTelefono) + '</a>'
        : 'Sin WhatsApp';
      return '<article class="order-card"><div class="order-head"><div><h3>Pedido ' +
        escapeHtml(order.id) + '</h3><p>' + escapeHtml(order.clienteNombre || 'Cliente') +
        ' · ' + contact + ' · ' + escapeHtml(formatDate(order.createdAt)) + '</p></div>' +
        '<span class="order-status ' + escapeHtml(order.estado || 'pendiente') + '">' +
        escapeHtml(orderStatusLabel(order.estado)) + '</span></div><div class="order-body">' +
        '<div class="order-items">' + items + '</div><div class="order-detail">' +
          '<div><span>Subtotal</span><b>' + escapeHtml(formatPrice(order.subtotal)) + '</b></div>' +
          '<div><span>Descuento</span><b>- ' + escapeHtml(formatPrice(order.discount)) + '</b></div>' +
          '<div><span>Pago</span><b>' + escapeHtml(order.paymentMethod || 'Por confirmar') + '</b></div>' +
          '<div><span>Dispositivo</span><b>' + escapeHtml(order.device || 'No indicado') + '</b></div>' +
          '<div><span>Puntos al confirmar</span><b>' + escapeHtml(order.pointsToAward || 0) + ' pts</b></div>' +
          '<div class="order-total"><span>Total</span><strong>' + escapeHtml(formatPrice(order.total)) +
          '</strong></div></div></div>' +
        (order.notes ? '<p class="order-notes"><b>Nota:</b> ' + escapeHtml(order.notes) + '</p>' : '') +
        actions + '</article>';
    }).join('') : '<div class="empty-list">No hay pedidos con ese estado.</div>';

    byId('ordersList').querySelectorAll('[data-confirm-order]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var orderId = button.getAttribute('data-confirm-order');
        if (!window.confirm('¿Confirma que el pago fue recibido? Esta acción acreditará los puntos.')) return;
        button.disabled = true;
        button.textContent = 'Confirmando…';
        try {
          var data = await request('confirm-order', { orderId: orderId });
          toast(data.message, 'success');
          await loadOrders();
        } catch (error) {
          toast(error.message, 'error');
          button.disabled = false;
          button.textContent = 'Confirmar pago y puntos';
        }
      });
    });
    byId('ordersList').querySelectorAll('[data-cancel-order]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var orderId = button.getAttribute('data-cancel-order');
        if (!window.confirm('¿Desea cancelar este pedido pendiente?')) return;
        button.disabled = true;
        try {
          var data = await request('cancel-order', { orderId: orderId });
          toast(data.message, 'success');
          await loadOrders();
        } catch (error) {
          toast(error.message, 'error');
          button.disabled = false;
        }
      });
    });
  }

  async function loadOrders() {
    byId('ordersList').innerHTML = '<div class="empty-list">Cargando pedidos…</div>';
    try {
      var data = await request('orders', { limit: 150 });
      state.orders = data.orders || [];
      renderOrdersList();
    } catch (error) {
      byId('ordersList').innerHTML = '<div class="empty-list">' + escapeHtml(error.message) + '</div>';
    }
  }

  function clientById(id) {
    return state.clients.find(function (client) { return client.id === id; });
  }

  function renderClientList() {
    var query = byId('clientSearch').value.trim().toLowerCase();
    var clients = state.clients.filter(function (client) {
      return !query || (
        client.fullName + ' ' + client.correo + ' ' + client.telefono
      ).toLowerCase().includes(query);
    });
    byId('clientList').innerHTML = clients.length ? clients.map(function (client) {
      return '<button type="button" class="list-item' +
        (state.selectedClientId === client.id ? ' active' : '') + '" data-client-id="' +
        escapeHtml(client.id) + '"><span class="item-visual client-list-avatar">' +
        escapeHtml(client.avatar || '🦊') + '</span><span><strong>' +
        escapeHtml(client.fullName || 'Cliente') + '</strong><small>' +
        escapeHtml(client.correo || 'Sin correo') + ' · +' + escapeHtml(client.telefono || '') +
        '</small></span><em class="item-status status-available">' +
        escapeHtml(client.puntos || 0) + ' pts</em></button>';
    }).join('') : '<div class="empty-list">No se encontraron clientes.</div>';

    byId('clientList').querySelectorAll('[data-client-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedClientId = button.getAttribute('data-client-id');
        renderClientList();
        renderClientEditor();
      });
    });
  }

  function renderClientEditor() {
    var client = clientById(state.selectedClientId);
    if (!client) {
      byId('clientEditor').innerHTML =
        '<div class="empty-editor"><span>♟</span><h3>Seleccione un cliente</h3></div>';
      return;
    }
    byId('clientEditor').innerHTML =
      '<div class="editor-head"><span class="client-avatar">' + escapeHtml(client.avatar || '🦊') +
      '</span><div><h2>' + escapeHtml(client.fullName || 'Cliente') + '</h2><p>ID: ' +
      escapeHtml(client.id) + '</p></div><div class="client-balance"><strong>' +
      escapeHtml(client.puntos || 0) + '</strong><small>puntos disponibles</small></div></div>' +
      '<div class="client-details">' +
        '<div class="client-detail"><small>WhatsApp</small><strong>+' +
          escapeHtml(client.telefono || 'No registrado') + '</strong></div>' +
        '<div class="client-detail"><small>Correo</small><strong>' +
          escapeHtml(client.correo || 'No registrado') + '</strong></div>' +
        '<div class="client-detail"><small>Fecha de nacimiento</small><strong>' +
          escapeHtml(client.fechaNacimiento || 'No registrada') + '</strong></div>' +
        '<div class="client-detail"><small>Cliente desde</small><strong>' +
          escapeHtml(formatDate(client.createdAt)) + '</strong></div>' +
        '<div class="client-detail"><small>Último acceso</small><strong>' +
          escapeHtml(formatDate(client.lastLoginAt)) + '</strong></div>' +
      '</div>' +
      '<form class="points-adjust" id="pointsAdjustForm"><h3>Ajuste manual de puntos</h3>' +
        '<p>Use valores positivos para acreditar y negativos para descontar. El movimiento queda auditado.</p>' +
        '<div class="points-adjust-grid"><label>Cantidad<input id="pointsDelta" type="number" min="-1000" max="1000" required></label>' +
        '<label>Motivo<input id="pointsReason" maxlength="240" placeholder="Ej.: corrección de compra" required></label>' +
        '<button class="secondary" type="submit">Aplicar ajuste</button></div></form>';

    byId('pointsAdjustForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        var data = await request('adjust-points', {
          clientId: client.id,
          delta: byId('pointsDelta').value,
          reason: byId('pointsReason').value
        });
        client.puntos = data.points;
        renderClientList();
        renderClientEditor();
        toast(data.message, 'success');
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  }

  async function loadClients() {
    byId('clientList').innerHTML = '<div class="empty-list">Cargando clientes…</div>';
    try {
      var data = await request('clients', { limit: 300 });
      state.clients = data.clients || [];
      if (!clientById(state.selectedClientId)) {
        state.selectedClientId = state.clients[0] ? state.clients[0].id : '';
      }
      renderClientList();
      renderClientEditor();
    } catch (error) {
      byId('clientList').innerHTML = '<div class="empty-list">' + escapeHtml(error.message) + '</div>';
      state.clients = [];
      state.selectedClientId = '';
      renderClientEditor();
    }
  }

  async function renderHistory() {
    byId('historyList').innerHTML = '<div class="empty-list">Cargando historial…</div>';
    try {
      var data = await request('history', { limit: 30 });
      byId('historyList').innerHTML = data.history.length ? data.history.map(function (item) {
        var date = item.createdAt ? new Date(item.createdAt).toLocaleString('es-HN') : 'Fecha pendiente';
        return '<article class="history-item"><span class="history-version">v' +
          escapeHtml(item.catalogVersion) + '</span><span><strong>Publicación por ' +
          escapeHtml(item.actor || 'admin') + '</strong><small>' +
          escapeHtml(item.productCount) + ' productos · ' + escapeHtml(item.promotionCount) +
          ' promociones</small></span><time>' + escapeHtml(date) + '</time></article>';
      }).join('') : '<div class="empty-list">Todavía no hay publicaciones registradas.</div>';
    } catch (error) {
      byId('historyList').innerHTML = '<div class="empty-list">' + escapeHtml(error.message) + '</div>';
    }
  }

  function renderAll() {
    if (!state.catalog) return;
    renderStats();
    renderCategoryFilter();
    renderProductList();
    renderProductEditor();
    renderPromotionList();
    renderPromotionEditor();
    renderAvailability();
    renderSettings();
  }

  function selectView(view) {
    state.currentView = view;
    document.querySelectorAll('.admin-nav').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-view') === view);
    });
    document.querySelectorAll('.admin-view').forEach(function (section) {
      section.classList.toggle('active', section.id === 'view-' + view);
    });
    byId('adminViewTitle').textContent = TITLES[view] || 'Panel administrativo';
    byId('adminSidebar').classList.remove('open');
    var catalogActionVisible = ['products', 'promotions', 'availability', 'settings'].includes(view);
    byId('saveCatalog').hidden = !catalogActionVisible;
    byId('adminSaveState').hidden = !catalogActionVisible;
    if (view === 'orders') loadOrders();
    if (view === 'clients') loadClients();
    if (view === 'history') renderHistory();
  }

  async function saveCatalog() {
    if (!state.catalog || !state.dirty) {
      toast('No hay cambios pendientes.', '');
      return;
    }
    var button = byId('saveCatalog');
    button.disabled = true;
    button.textContent = 'Publicando…';
    try {
      var data = await request('save', { catalog: state.catalog });
      state.catalog = data.catalog;
      setDirty(false);
      renderAll();
      toast('Catálogo publicado. Web, SubliStore y SubliBot usarán la nueva versión.', 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Guardar y publicar';
    }
  }

  function newProduct() {
    var id = 'producto-' + Date.now();
    state.catalog.products.push({
      id: id,
      name: 'Nuevo producto',
      categoryId: state.catalog.categories[0] ? state.catalog.categories[0].id : 'streaming',
      active: true,
      storeEnabled: true,
      redemptionOnly: false,
      availability: 'available',
      order: state.catalog.products.length * 10 + 10,
      accent: '#E2231A',
      visual: 'NEW',
      imageUrl: '',
      summary: '',
      productFeatures: [],
      plans: [{
        id: 'monthly',
        name: 'Mensual',
        price: null,
        billingLabel: '/mes',
        active: true,
        availability: 'available',
        badge: '',
        pointsCost: null,
        features: [],
        options: []
      }]
    });
    state.selectedProductId = id;
    setDirty();
    renderAll();
  }

  function newPromotion() {
    var id = 'promocion-' + Date.now();
    state.catalog.promotions.push({
      id: id,
      title: 'Nueva promoción',
      description: '',
      active: true,
      startsAt: '',
      endsAt: '',
      order: state.catalog.promotions.length * 10 + 10,
      accent: '#E2231A',
      productIds: [],
      features: [],
      options: [{ id: 'option-1', label: 'Promoción', price: null, bonus: '' }]
    });
    state.selectedPromotionId = id;
    setDirty();
    renderPromotionList();
    renderPromotionEditor();
    renderStats();
  }

  function bindStaticEvents() {
    byId('adminLoginForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      byId('adminLoginMessage').textContent = 'Verificando…';
      try {
        var data = await request('login', {
          user: byId('adminUser').value.trim(),
          password: byId('adminPassword').value
        });
        state.token = data.token;
        state.user = data.user;
        sessionStorage.setItem('subliAdminToken', state.token);
        sessionStorage.setItem('subliAdminUser', state.user);
        byId('adminPassword').value = '';
        byId('adminLoginMessage').textContent = '';
        await loadCatalog();
      } catch (error) {
        byId('adminLoginMessage').textContent = error.message;
      }
    });
    byId('toggleAdminPassword').addEventListener('click', function () {
      var input = byId('adminPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
      byId('toggleAdminPassword').textContent = input.type === 'password' ? 'Ver' : 'Ocultar';
    });
    byId('adminLogout').addEventListener('click', function () {
      sessionStorage.removeItem('subliAdminToken');
      sessionStorage.removeItem('subliAdminUser');
      state.token = '';
      state.catalog = null;
      state.orders = [];
      state.clients = [];
      showLogin('');
    });
    document.querySelectorAll('.admin-nav').forEach(function (button) {
      button.addEventListener('click', function () { selectView(button.getAttribute('data-view')); });
    });
    byId('adminMenuButton').addEventListener('click', function () {
      byId('adminSidebar').classList.toggle('open');
    });
    byId('saveCatalog').addEventListener('click', saveCatalog);
    byId('newProduct').addEventListener('click', newProduct);
    byId('newPromotion').addEventListener('click', newPromotion);
    byId('productSearch').addEventListener('input', renderProductList);
    byId('productCategoryFilter').addEventListener('change', renderProductList);
    byId('orderStatusFilter').addEventListener('change', renderOrdersList);
    byId('refreshOrders').addEventListener('click', loadOrders);
    byId('clientSearch').addEventListener('input', renderClientList);
    byId('refreshClients').addEventListener('click', loadClients);
    byId('refreshHistory').addEventListener('click', renderHistory);
    window.addEventListener('beforeunload', function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  bindStaticEvents();
  if (state.token) loadCatalog();
  else showLogin('');
})();
