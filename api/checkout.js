import { db, FieldValue } from './_lib/firebase.js';
import { findCatalogSelection, formatPrice, publicCatalog } from './_lib/catalog.js';
import { loadCatalogSnapshot } from './_lib/catalog-store.js';
import { storeClientFromRequest } from './_lib/store-session.js';
import { tgMessage, tgPhoto } from './_lib/tg.js';

function bodyOf(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body || {};
}

function comboDiscount(catalog, selections) {
  const streamingIds = new Set(
    catalog.products
      .filter((product) => product.categoryId === 'streaming')
      .map((product) => product.id)
  );
  const selectedPlatforms = new Set(
    selections
      .filter((selection) => selection.kind === 'product' && streamingIds.has(selection.id))
      .map((selection) => selection.id)
  );
  const count = Math.min(catalog.settings.maxComboItems || 5, selectedPlatforms.size);
  const rules = (catalog.settings.comboDiscounts || [])
    .filter((rule) => Number(rule.itemCount) <= count)
    .sort((a, b) => Number(b.itemCount) - Number(a.itemCount));
  return rules.length ? Number(rules[0].amount) || 0 : 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const cliente = await storeClientFromRequest(req);
    if (!cliente) return res.status(401).json({ ok: false, error: 'Inicie sesión nuevamente.' });

    const body = bodyOf(req);
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    if (!rawItems.length) {
      return res.status(400).json({ ok: false, error: 'El carrito está vacío.' });
    }

    const snapshot = await loadCatalogSnapshot();
    const catalog = publicCatalog(snapshot.catalog);
    const selections = rawItems
      .map((item) => findCatalogSelection(catalog, item))
      .filter(Boolean);
    if (selections.length !== rawItems.length) {
      return res.status(409).json({
        ok: false,
        error: 'Uno de los precios cambió o un servicio dejó de estar disponible. Actualice el carrito.'
      });
    }

    const subtotal = selections.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const discount = Math.min(subtotal, comboDiscount(catalog, selections));
    const total = Math.max(0, subtotal - discount);
    const requestedPayment = String(body.paymentMethod || '').trim();
    const activePaymentMethods = (catalog.settings.paymentMethods || [])
      .filter((method) => method.active);
    const selectedPaymentMethod = activePaymentMethods.find((method) => (
      method.id === requestedPayment || method.name === requestedPayment
    ));
    if (!selectedPaymentMethod) {
      return res.status(409).json({
        ok: false,
        error: 'Ese método de pago ya no está disponible. Actualice el pedido.'
      });
    }
    const paymentMethod = selectedPaymentMethod.name;
    const device = String(body.device || '').slice(0, 100);
    const notes = String(body.notes || '').slice(0, 800);
    const reference = db.collection('compras').doc();

    await reference.set({
      clienteId: cliente.id,
      clienteNombre: cliente.fullName,
      clienteTelefono: cliente.telefono,
      clienteCorreo: cliente.correo,
      items: selections,
      subtotal,
      discount,
      total,
      currency: catalog.settings.currency,
      paymentMethod,
      device,
      notes,
      estado: 'pendiente',
      puntosOtorgados: false,
      pointsToAward: Number(catalog.settings.pointsPerConfirmedPurchase) || 0,
      catalogVersion: catalog.catalogVersion,
      createdAt: FieldValue.serverTimestamp()
    });

    const itemLines = selections.map((item) => (
      `• ${item.name} / ${item.planName} x${item.quantity} — ${formatPrice(item.price * item.quantity, catalog.settings)}`
    ));
    const message = [
      '🛒 *NUEVO PEDIDO SUBLISTORE*',
      '',
      `Pedido: ${reference.id}`,
      `Cliente: ${cliente.fullName}`,
      `WhatsApp: +${cliente.telefono}`,
      '',
      ...itemLines,
      '',
      `Subtotal: ${formatPrice(subtotal, catalog.settings)}`,
      `Descuento combo: ${formatPrice(discount, catalog.settings)}`,
      `TOTAL: ${formatPrice(total, catalog.settings)}`,
      `Pago: ${paymentMethod}`,
      device ? `Dispositivo: ${device}` : '',
      notes ? `Notas: ${notes}` : ''
    ].filter(Boolean).join('\n');

    const receipt = String(body.receiptDataUrl || '');
    if (receipt.startsWith('data:image/') && receipt.length < 8_000_000) {
      await tgPhoto(receipt, message).catch(() => tgMessage(message));
    } else {
      await tgMessage(message);
    }

    return res.status(200).json({
      ok: true,
      purchaseId: reference.id,
      subtotal,
      discount,
      total,
      currencyLabel: catalog.settings.currencyLabel,
      message: 'Pedido recibido. Un asesor confirmará su pago.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error && error.message || error || 'No se pudo registrar el pedido.')
    });
  }
}
