import { cloneDefaultCatalog } from './catalog-default.js';

export const AVAILABILITY = {
  available: { label: 'Disponible', shortLabel: 'Disponible', purchasable: true },
  limited: { label: 'Pocas disponibles', shortLabel: 'Limitado', purchasable: true },
  on_request: { label: 'Bajo pedido', shortLabel: 'Bajo pedido', purchasable: true },
  paused: { label: 'Temporalmente no disponible', shortLabel: 'No disponible', purchasable: false },
  maintenance: { label: 'En mantenimiento', shortLabel: 'Mantenimiento', purchasable: false }
};

const cleanText = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);
const cleanId = (value) => cleanText(value, 80)
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '');

function cleanPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000000) return null;
  return Math.round(parsed * 100) / 100;
}

function cleanAvailability(value) {
  return AVAILABILITY[value] ? value : 'available';
}

function cleanImageUrl(value) {
  const url = cleanText(value, 1200);
  if (!url) return '';

  if (url.startsWith('/assets/')) {
    const assetPath = url.slice('/assets/'.length);
    const segments = assetPath.split('/');
    const isSafeAssetPath = /^[a-z0-9][a-z0-9._/-]*$/i.test(assetPath)
      && segments.every((segment) => segment && segment !== '.' && segment !== '..');
    return isSafeAssetPath ? `/assets/${assetPath}` : '';
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch (error) {
    return '';
  }
}

function cleanOption(option, fallbackIndex) {
  return {
    id: cleanId(option && option.id) || `option-${fallbackIndex + 1}`,
    label: cleanText(option && option.label, 120) || `Opción ${fallbackIndex + 1}`,
    price: cleanPrice(option && option.price),
    bonus: cleanText(option && option.bonus, 120)
  };
}

function cleanPlan(plan, fallbackIndex) {
  const options = Array.isArray(plan && plan.options)
    ? plan.options.map(cleanOption).filter((option) => option.label)
    : [];
  const features = Array.isArray(plan && plan.features)
    ? plan.features.map((feature) => cleanText(feature, 240)).filter(Boolean).slice(0, 12)
    : [];

  return {
    id: cleanId(plan && plan.id) || `plan-${fallbackIndex + 1}`,
    name: cleanText(plan && plan.name, 120) || `Plan ${fallbackIndex + 1}`,
    price: cleanPrice(plan && plan.price),
    billingLabel: cleanText(plan && plan.billingLabel, 60),
    active: plan && plan.active !== false,
    availability: cleanAvailability(plan && plan.availability),
    badge: cleanText(plan && plan.badge, 60),
    pointsCost: cleanPrice(plan && plan.pointsCost),
    features,
    options
  };
}

function cleanProduct(product, fallbackIndex) {
  const plans = Array.isArray(product && product.plans)
    ? product.plans.map(cleanPlan).filter((plan) => plan.id)
    : [];

  return {
    id: cleanId(product && product.id) || `product-${fallbackIndex + 1}`,
    name: cleanText(product && product.name, 120) || `Producto ${fallbackIndex + 1}`,
    categoryId: cleanId(product && product.categoryId) || 'streaming',
    active: product && product.active !== false,
    storeEnabled: product && product.storeEnabled !== false,
    redemptionOnly: Boolean(product && product.redemptionOnly),
    availability: cleanAvailability(product && product.availability),
    order: Number.isFinite(Number(product && product.order)) ? Number(product.order) : fallbackIndex * 10,
    accent: /^#[0-9a-f]{6}$/i.test(String(product && product.accent || ''))
      ? String(product.accent)
      : '#E2231A',
    visual: cleanText(product && product.visual, 20),
    imageUrl: cleanImageUrl(product && product.imageUrl),
    summary: cleanText(product && product.summary, 360),
    productFeatures: Array.isArray(product && product.productFeatures)
      ? product.productFeatures.map((feature) => cleanText(feature, 240)).filter(Boolean).slice(0, 12)
      : [],
    plans
  };
}

function cleanPromotion(promotion, fallbackIndex) {
  return {
    id: cleanId(promotion && promotion.id) || `promotion-${fallbackIndex + 1}`,
    title: cleanText(promotion && promotion.title, 160) || `Promoción ${fallbackIndex + 1}`,
    description: cleanText(promotion && promotion.description, 420),
    active: promotion && promotion.active !== false,
    startsAt: cleanText(promotion && promotion.startsAt, 40),
    endsAt: cleanText(promotion && promotion.endsAt, 40),
    order: Number.isFinite(Number(promotion && promotion.order))
      ? Number(promotion.order)
      : fallbackIndex * 10,
    accent: /^#[0-9a-f]{6}$/i.test(String(promotion && promotion.accent || ''))
      ? String(promotion.accent)
      : '#E2231A',
    productIds: Array.isArray(promotion && promotion.productIds)
      ? promotion.productIds.map(cleanId).filter(Boolean).slice(0, 8)
      : [],
    features: Array.isArray(promotion && promotion.features)
      ? promotion.features.map((feature) => cleanText(feature, 220)).filter(Boolean).slice(0, 10)
      : [],
    options: Array.isArray(promotion && promotion.options)
      ? promotion.options.map(cleanOption).filter((option) => option.label)
      : []
  };
}

function cleanSettings(settings) {
  const defaults = cloneDefaultCatalog().settings;
  const source = settings || {};
  const methods = Array.isArray(source.paymentMethods)
    ? source.paymentMethods.map((method, index) => ({
      id: cleanId(method && method.id) || `payment-${index + 1}`,
      name: cleanText(method && method.name, 100) || `Método ${index + 1}`,
      active: method && method.active !== false,
      instructions: cleanText(method && method.instructions, 500),
      accountName: cleanText(method && method.accountName, 140),
      accountNumber: cleanText(method && method.accountNumber, 140)
    }))
    : defaults.paymentMethods;
  const discounts = Array.isArray(source.comboDiscounts)
    ? source.comboDiscounts.map((discount) => ({
      itemCount: Math.max(2, Math.min(5, Number(discount && discount.itemCount) || 2)),
      amount: cleanPrice(discount && discount.amount) || 0
    }))
    : defaults.comboDiscounts;

  return {
    brand: cleanText(source.brand, 80) || defaults.brand,
    slogan: cleanText(source.slogan, 160) || defaults.slogan,
    currency: cleanText(source.currency, 10) || defaults.currency,
    currencyLabel: cleanText(source.currencyLabel, 20) || defaults.currencyLabel,
    locale: cleanText(source.locale, 20) || defaults.locale,
    whatsapp: cleanText(source.whatsapp, 30).replace(/\D/g, '') || defaults.whatsapp,
    pointsPerConfirmedPurchase: cleanPrice(source.pointsPerConfirmedPurchase)
      ?? defaults.pointsPerConfirmedPurchase,
    maxComboItems: Math.max(2, Math.min(5, Number(source.maxComboItems) || defaults.maxComboItems)),
    comboDiscounts: discounts,
    paymentMethods: methods
  };
}

export function normalizeCatalog(input) {
  const fallback = cloneDefaultCatalog();
  const source = input && typeof input === 'object' ? input : fallback;
  const categories = Array.isArray(source.categories)
    ? source.categories.map((category, index) => ({
      id: cleanId(category && category.id) || `category-${index + 1}`,
      name: cleanText(category && category.name, 100) || `Categoría ${index + 1}`,
      icon: cleanText(category && category.icon, 12),
      order: Number.isFinite(Number(category && category.order)) ? Number(category.order) : index * 10,
      active: category && category.active !== false
    }))
    : fallback.categories;
  const products = Array.isArray(source.products)
    ? source.products.map(cleanProduct).filter((product) => product.id && product.plans.length)
    : fallback.products;
  const promotions = Array.isArray(source.promotions)
    ? source.promotions.map(cleanPromotion).filter((promotion) => promotion.id)
    : fallback.promotions;

  return {
    schemaVersion: 1,
    catalogVersion: Math.max(1, Number(source.catalogVersion) || 1),
    updatedAt: cleanText(source.updatedAt, 40) || new Date().toISOString(),
    settings: cleanSettings(source.settings),
    categories,
    products,
    promotions
  };
}

export function validateCatalog(input) {
  const catalog = normalizeCatalog(input);
  const errors = [];
  const productIds = new Set();
  const categoryIds = new Set();
  const promotionIds = new Set();

  catalog.categories.forEach((category) => {
    if (categoryIds.has(category.id)) errors.push(`Categoría duplicada: ${category.id}`);
    categoryIds.add(category.id);
  });

  catalog.products.forEach((product) => {
    if (productIds.has(product.id)) errors.push(`Producto duplicado: ${product.id}`);
    productIds.add(product.id);
    if (!categoryIds.has(product.categoryId)) {
      errors.push(`Categoría inexistente para ${product.name}: ${product.categoryId}`);
    }
    const planIds = new Set();
    product.plans.forEach((plan) => {
      if (planIds.has(plan.id)) errors.push(`Plan duplicado en ${product.name}: ${plan.id}`);
      planIds.add(plan.id);
      if (plan.availability !== 'paused' && plan.active && plan.price === null && !plan.options.length) {
        if (plan.availability !== 'on_request' && product.redemptionOnly !== true) {
          errors.push(`Falta precio u opciones en ${product.name} / ${plan.name}`);
        }
      }
    });
  });

  catalog.promotions.forEach((promotion) => {
    if (promotionIds.has(promotion.id)) errors.push(`Promoción duplicada: ${promotion.id}`);
    promotionIds.add(promotion.id);
    promotion.productIds.forEach((productId) => {
      if (!productIds.has(productId)) {
        errors.push(`Producto inexistente en ${promotion.title}: ${productId}`);
      }
    });
    if (promotion.active && !promotion.options.some((option) => option.price !== null)) {
      errors.push(`Falta un precio en la promoción ${promotion.title}`);
    }
    const start = promotion.startsAt ? Date.parse(promotion.startsAt) : NaN;
    const end = promotion.endsAt ? Date.parse(promotion.endsAt) : NaN;
    if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
      errors.push(`La fecha final debe ser posterior al inicio en ${promotion.title}`);
    }
  });

  return { catalog, errors };
}

export function isPromotionActive(promotion, now = new Date()) {
  if (!promotion || promotion.active === false) return false;
  const current = now.getTime();
  const starts = promotion.startsAt ? Date.parse(promotion.startsAt) : NaN;
  const ends = promotion.endsAt ? Date.parse(promotion.endsAt) : NaN;
  if (Number.isFinite(starts) && current < starts) return false;
  if (Number.isFinite(ends) && current > ends) return false;
  return true;
}

export function publicCatalog(input, now = new Date()) {
  const catalog = normalizeCatalog(input);
  const products = catalog.products
    .filter((product) => product.active)
    .sort((a, b) => a.order - b.order);
  const availableProductIds = new Set(
    products
      .filter((product) => AVAILABILITY[product.availability].purchasable)
      .map((product) => product.id)
  );
  return {
    ...catalog,
    categories: catalog.categories
      .filter((category) => category.active)
      .sort((a, b) => a.order - b.order),
    products,
    promotions: catalog.promotions
      .filter((promotion) => (
        isPromotionActive(promotion, now) &&
        (promotion.productIds || []).every((productId) => availableProductIds.has(productId))
      ))
      .sort((a, b) => a.order - b.order)
  };
}

export function formatPrice(value, settings = {}) {
  if (value === null || value === undefined || value === '') return 'Consultar disponibilidad';
  const locale = settings.locale || 'es-HN';
  const currencyLabel = settings.currencyLabel || 'Lps.';
  return `${currencyLabel} ${Number(value).toLocaleString(locale, {
    minimumFractionDigits: Number(value) % 1 ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
}

export function findCatalogSelection(catalogInput, item) {
  const catalog = publicCatalog(catalogInput);
  if (item && item.kind === 'promotion') {
    const promotion = catalog.promotions.find((candidate) => candidate.id === item.promotionId);
    const option = promotion && promotion.options.find((candidate) => candidate.id === item.optionId);
    if (!promotion || !option || option.price === null) return null;
    return {
      kind: 'promotion',
      id: promotion.id,
      optionId: option.id,
      name: promotion.title,
      planName: option.label,
      price: option.price,
      quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1))
    };
  }

  const product = catalog.products.find((candidate) => candidate.id === (item && item.productId));
  const plan = product && product.plans.find((candidate) => candidate.id === item.planId);
  if (!product || !plan || !plan.active || !product.storeEnabled || product.redemptionOnly) return null;
  if (!AVAILABILITY[product.availability].purchasable) return null;
  if (!AVAILABILITY[plan.availability].purchasable) return null;
  const option = item.optionId && plan.options.length
    ? plan.options.find((candidate) => candidate.id === item.optionId)
    : null;
  const price = option ? option.price : plan.price;
  if (price === null) return null;
  return {
    kind: 'product',
    id: product.id,
    planId: plan.id,
    optionId: option ? option.id : '',
    name: product.name,
    planName: option ? `${plan.name} · ${option.label}` : plan.name,
    price,
    quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1))
  };
}

export function assistantCatalogText(input) {
  const catalog = publicCatalog(input);
  const lines = [
    '=== CATÁLOGO CENTRAL VIGENTE: ESTA SECCIÓN MANDA SOBRE CUALQUIER PRECIO ANTERIOR ===',
    'No invente precios. No ofrezca productos o planes pausados.'
  ];

  catalog.categories.forEach((category) => {
    const products = catalog.products.filter((product) => product.categoryId === category.id);
    if (!products.length) return;
    lines.push('', `${category.name.toUpperCase()}:`);
    products.forEach((product) => {
      if (product.availability === 'paused') {
        lines.push(`- ${product.name}: temporalmente no disponible.`);
        return;
      }
      product.plans.filter((plan) => plan.active).forEach((plan) => {
        const status = AVAILABILITY[plan.availability].label;
        if (plan.options.length) {
          const options = plan.options
            .map((option) => `${option.label} ${formatPrice(option.price, catalog.settings)}${option.bonus ? ` (${option.bonus})` : ''}`)
            .join(' · ');
          lines.push(`- ${product.name} / ${plan.name}: ${options}. Estado: ${status}.`);
        } else {
          lines.push(
            `- ${product.name} / ${plan.name}: ${formatPrice(plan.price, catalog.settings)}${plan.billingLabel || ''}. Estado: ${status}.`
          );
        }
        if (plan.features.length) lines.push(`  Características: ${plan.features.join(' · ')}`);
      });
    });
  });

  if (catalog.promotions.length) {
    lines.push('', 'PROMOCIONES ACTIVAS:');
    catalog.promotions.forEach((promotion) => {
      const options = promotion.options
        .map((option) => `${option.label} ${formatPrice(option.price, catalog.settings)}${option.bonus ? ` (${option.bonus})` : ''}`)
        .join(' · ');
      lines.push(`- ${promotion.title}: ${options}. ${promotion.features.join(' · ')}`);
    });
  }

  lines.push('', `WhatsApp de ventas: +${catalog.settings.whatsapp}`);
  return lines.join('\n');
}
