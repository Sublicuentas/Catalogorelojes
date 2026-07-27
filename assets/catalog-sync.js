(function () {
  'use strict';

  var REFRESH_MS = 60 * 1000;
  var STATUS = {
    available: { label: 'Disponible', purchasable: true },
    limited: { label: 'Pocas disponibles', purchasable: true },
    on_request: { label: 'Bajo pedido', purchasable: true },
    paused: { label: 'No disponible', purchasable: false },
    maintenance: { label: 'Mantenimiento', purchasable: false }
  };
  var PRODUCT_ALIASES = {
    netflix: 'netflix',
    disney: 'disney',
    'disney+': 'disney',
    'hbo max': 'hbo-max',
    'prime video': 'prime-video',
    crunchyroll: 'crunchyroll',
    vix: 'vix',
    'paramount+': 'paramount',
    paramount: 'paramount',
    'viki rakuten': 'viki',
    'deezer premium': 'deezer',
    'spotify premium': 'spotify',
    'youtube premium': 'youtube-premium',
    'oleada tv': 'oleada-tv',
    'latin tv': 'latin-tv',
    'lion tv': 'lion-tv',
    'chatgpt plus': 'chatgpt-plus',
    'gemini pro': 'gemini-pro',
    perplexity: 'perplexity',
    'duolingo plus': 'duolingo',
    'canva edu pro': 'canva',
    'adobe express premium': 'adobe-express',
    'eset antivirus': 'eset',
    'windows 10/11': 'windows',
    'office 365': 'office-365'
  };

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function statusOf(value) {
    return STATUS[value] || STATUS.available;
  }
  function formatNumber(value, catalog) {
    if (value === null || value === undefined || value === '') return '';
    var settings = catalog.settings || {};
    return Number(value).toLocaleString(settings.locale || 'es-HN', {
      minimumFractionDigits: Number(value) % 1 ? 2 : 0,
      maximumFractionDigits: 2
    });
  }
  function priceText(value, catalog) {
    if (value === null || value === undefined || value === '') return 'Consultar disponibilidad';
    return (catalog.settings.currencyLabel || 'Lps.') + ' ' + formatNumber(value, catalog);
  }
  function productById(catalog, id) {
    return catalog.products.find(function (product) { return product.id === id; });
  }
  function productIdFromName(name) {
    var key = normalize(name).replace(/\s*\([^)]*\)\s*/g, '').trim();
    return PRODUCT_ALIASES[key] || '';
  }
  function planForCard(product, card, index) {
    var nameNode = card.querySelector('.pn');
    var name = normalize(nameNode && nameNode.textContent);
    var exact = product.plans.find(function (plan) { return normalize(plan.name) === name; });
    if (exact) return exact;
    var included = product.plans.find(function (plan) {
      var planName = normalize(plan.name);
      return name.includes(planName) || planName.includes(name);
    });
    if (included) return included;
    if (product.id === 'netflix') return name.includes('vip') ? product.plans[1] : product.plans[0];
    if (product.id === 'disney') return name.includes('premium') ? product.plans[0] : product.plans[1];
    return product.plans[index] || product.plans[0];
  }
  function setStatusBadge(header, value) {
    if (!header) return;
    var badge = header.querySelector('.catalog-status');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'catalog-status';
      var arrow = header.querySelector('.parr');
      header.insertBefore(badge, arrow || null);
    }
    badge.className = 'catalog-status ' + value;
    badge.textContent = statusOf(value).label;
  }
  function updateImage(root, product) {
    if (!product.imageUrl) return;
    var image = root.querySelector('.pi img');
    if (!image) return;
    image.src = product.imageUrl;
    image.loading = 'lazy';
    image.decoding = 'async';
  }
  function updateWhatsapp(anchor, catalog, product, plan, option) {
    if (!anchor) return;
    var productStatus = statusOf(product.availability);
    var planStatus = statusOf(plan.availability);
    var price = option ? option.price : plan.price;
    if (!productStatus.purchasable || !planStatus.purchasable || price === null) {
      anchor.classList.add('catalog-disabled');
      anchor.setAttribute('aria-disabled', 'true');
      anchor.removeAttribute('href');
      anchor.textContent = statusOf(plan.availability).label;
      return;
    }
    anchor.classList.remove('catalog-disabled');
    anchor.removeAttribute('aria-disabled');
    var phone = catalog.settings.whatsapp || '50432126332';
    var detail = option ? plan.name + ' · ' + option.label : plan.name;
    var message = 'Hola! Me interesa ' + product.name + ' · ' + detail + ' (' +
      priceText(price, catalog) + ')';
    anchor.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  }
  function updateFeatures(card, plan) {
    var list = card.querySelector('.pf');
    if (!list || !plan.features || !plan.features.length) return;
    list.innerHTML = plan.features.map(function (feature) {
      return '<li><span class="dot"></span>' + escapeHtml(feature) + '</li>';
    }).join('');
  }
  function updateOptionsTable(card, plan, catalog) {
    var rows = card.querySelectorAll('.pt table tr');
    if (!rows.length || !plan.options || !plan.options.length) return;
    Array.prototype.slice.call(rows, 1).forEach(function (row, index) {
      var option = plan.options[index];
      if (!option) {
        row.hidden = true;
        return;
      }
      row.hidden = false;
      var cells = row.querySelectorAll('td');
      if (cells[0]) {
        cells[0].innerHTML = escapeHtml(option.label) +
          (option.bonus ? '<span class="bonus">' + escapeHtml(option.bonus) + '</span>' : '');
      }
      if (cells[1]) cells[1].textContent = priceText(option.price, catalog);
    });
  }
  function updatePlanCard(card, product, plan, catalog) {
    if (!plan) return;
    card.hidden = !plan.active;
    card.setAttribute('data-catalog-plan', plan.id);
    var planName = card.querySelector('.pn');
    if (planName) planName.textContent = plan.name;
    var price = card.querySelector('.price');
    if (price) {
      if (plan.options && plan.options.length) {
        var values = plan.options.map(function (option) { return Number(option.price); })
          .filter(function (value) { return Number.isFinite(value); });
        var minimum = values.length ? Math.min.apply(Math, values) : plan.price;
        price.textContent = minimum === null ? statusOf(plan.availability).label : 'Desde ' + priceText(minimum, catalog);
      } else if (plan.price === null) {
        price.textContent = statusOf(plan.availability).label;
      } else {
        price.innerHTML = escapeHtml(priceText(plan.price, catalog)) +
          (plan.billingLabel ? '<sub>' + escapeHtml(plan.billingLabel) + '</sub>' : '');
      }
    }
    updateFeatures(card, plan);
    updateOptionsTable(card, plan, catalog);
    updateWhatsapp(card.querySelector('.cta-btn'), catalog, product, plan, null);
  }
  function updateLegacyProducts(catalog) {
    document.querySelectorAll('.ps').forEach(function (root) {
      var title = root.querySelector('.pinfo h2');
      var productId = productIdFromName(title && title.textContent);
      var product = productById(catalog, productId);
      if (!product) return;
      root.setAttribute('data-catalog-product', product.id);
      root.hidden = !product.active;
      if (title) title.textContent = product.name;
      updateImage(root, product);
      setStatusBadge(root.querySelector('.ph'), product.availability);
      var cards = root.querySelectorAll('.pw > .pc');
      var activePlans = product.plans.filter(function (plan) { return plan.active; });
      var description = root.querySelector('.pinfo p');
      if (description) {
        description.textContent = activePlans.length + (activePlans.length === 1 ? ' plan disponible' : ' planes disponibles');
      }
      cards.forEach(function (card, index) {
        updatePlanCard(card, product, planForCard(product, card, index), catalog);
      });
    });
  }
  function updateGaming(catalog) {
    var gameMap = {
      'free fire': 'free-fire',
      'pubg mobile': 'pubg-mobile',
      roblox: 'roblox'
    };
    document.querySelectorAll('.game-panel').forEach(function (panel) {
      var title = panel.querySelector('.game-text b');
      var product = productById(catalog, gameMap[normalize(title && title.textContent)]);
      if (!product) return;
      panel.hidden = !product.active;
      setStatusBadge(panel.querySelector('.game-head'), product.availability);
      var plan = product.plans.find(function (candidate) { return candidate.active; });
      var description = panel.querySelector('.game-desc');
      if (description && plan) {
        var options = (plan.options || []).map(function (option) {
          return '✅ ' + escapeHtml(option.label) + ' — <strong>' +
            escapeHtml(priceText(option.price, catalog)) + '</strong>' +
            (option.bonus ? ' · ' + escapeHtml(option.bonus) : '') + '<br>';
        }).join('');
        description.innerHTML = '<strong>' + escapeHtml(product.name) + ' · Precios vigentes</strong><br><br>' +
          (options || 'Consulte disponibilidad con un asesor.<br>') + '<br>' +
          (plan.features || []).map(function (feature) { return '✓ ' + escapeHtml(feature) + '<br>'; }).join('');
      }
      updateWhatsapp(panel.querySelector('.cta-btn'), catalog, product, plan || product.plans[0], null);
    });
  }
  function promoByTitle(catalog, title, index) {
    var key = normalize(title);
    return catalog.promotions.find(function (promotion) {
      var candidate = normalize(promotion.title);
      return key.includes(candidate) || candidate.includes(key);
    }) || catalog.promotions[index];
  }
  function updatePromotions(catalog) {
    var cards = document.querySelectorAll('#tab-promos .subli-promos-web-grid > .promo-card');
    cards.forEach(function (card, index) {
      var titleNode = card.querySelector('.promo-card-info h3');
      var promotion = promoByTitle(catalog, titleNode && titleNode.textContent, index);
      if (!promotion) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      card.setAttribute('data-catalog-promotion', promotion.id);
      if (titleNode) titleNode.textContent = promotion.title;
      var description = card.querySelector('.promo-card-info p');
      if (description) description.textContent = promotion.description || '';
      var conditions = card.querySelector('.promo-conditions');
      if (conditions) {
        conditions.innerHTML = (promotion.features || []).map(function (feature) {
          return '<span>✅ ' + escapeHtml(feature) + '</span>';
        }).join('');
      }
      var rows = card.querySelectorAll('.promo-price-row');
      rows.forEach(function (row, optionIndex) {
        var option = promotion.options[optionIndex];
        if (!option) {
          row.hidden = true;
          var orphanLink = row.nextElementSibling;
          if (orphanLink && orphanLink.classList.contains('promo-cta')) orphanLink.hidden = true;
          return;
        }
        row.hidden = false;
        var duration = row.querySelector('.promo-duration');
        var price = row.querySelector('.promo-price-pulse');
        if (duration) duration.textContent = option.label + (option.bonus ? ' · ' + option.bonus : '');
        if (price) price.textContent = formatNumber(option.price, catalog);
        var link = row.nextElementSibling;
        if (link && link.classList.contains('promo-cta')) {
          link.hidden = false;
          link.href = 'https://wa.me/' + (catalog.settings.whatsapp || '50432126332') +
            '?text=' + encodeURIComponent('Hola! Me interesa ' + promotion.title + ' · ' +
            option.label + ' (' + priceText(option.price, catalog) + ')');
        }
      });
    });
  }
  function updateGlobalWhatsapp(catalog) {
    var phone = catalog.settings.whatsapp || '50432126332';
    document.querySelectorAll('a[href*="wa.me/"]').forEach(function (anchor) {
      try {
        var url = new URL(anchor.href);
        var currentText = url.searchParams.get('text') || 'Hola! Quiero información de Sublicuentas';
        anchor.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(currentText);
      } catch (error) {}
    });
  }
  function updateSyncNote(catalog) {
    var hero = document.querySelector('.hero-top');
    if (!hero) return;
    var note = hero.querySelector('.catalog-sync-note');
    if (!note) {
      note = document.createElement('span');
      note.className = 'catalog-sync-note';
      hero.appendChild(note);
    }
    var date = catalog.updatedAt ? new Date(catalog.updatedAt) : new Date();
    note.textContent = 'Precios sincronizados · versión ' + (catalog.catalogVersion || 1) +
      (Number.isNaN(date.getTime()) ? '' : ' · ' + date.toLocaleDateString('es-HN'));
  }
  function applyCatalog(catalog) {
    window.__SUBLI_CATALOG__ = catalog;
    updateLegacyProducts(catalog);
    updateGaming(catalog);
    updatePromotions(catalog);
    updateGlobalWhatsapp(catalog);
    updateSyncNote(catalog);
    window.dispatchEvent(new CustomEvent('subli:catalog-updated', { detail: catalog }));
  }
  async function loadCatalog() {
    try {
      var response = await fetch('/api/catalogo?ts=' + Date.now(), {
        headers: { Accept: 'application/json' }
      });
      var payload = await response.json();
      if (!response.ok || !payload.catalog) throw new Error(payload.error || 'catálogo no disponible');
      applyCatalog(payload.catalog);
    } catch (error) {
      // El HTML conserva todos los precios originales como respaldo.
      console.warn('Sublicuentas: se mantiene el catálogo local de respaldo.', error);
    }
  }
  function boot() {
    loadCatalog();
    setInterval(loadCatalog, REFRESH_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) loadCatalog();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
