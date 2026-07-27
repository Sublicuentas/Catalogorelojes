import {
  adminFromRequest,
  adminIsConfigured,
  createAdminToken,
  verifyAdminCredentials
} from './_lib/admin-session.js';
import {
  loadCatalogHistory,
  loadCatalogSnapshot,
  saveCatalogSnapshot
} from './_lib/catalog-store.js';

function bodyOf(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body || {};
}

function timestampToIso(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function safeDocumentId(value, label) {
  const id = String(value || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) {
    const error = new Error(`${label} no válido.`);
    error.code = 'VALIDATION';
    throw error;
  }
  return id;
}

async function firebaseServices() {
  const module = await import('./_lib/firebase.js');
  return { db: module.db, FieldValue: module.FieldValue };
}

function publicOrder(document) {
  const data = document.data();
  return {
    id: document.id,
    clienteId: data.clienteId || '',
    clienteNombre: data.clienteNombre || '',
    clienteTelefono: data.clienteTelefono || '',
    clienteCorreo: data.clienteCorreo || '',
    items: Array.isArray(data.items) ? data.items.slice(0, 20).map((item) => ({
      kind: item.kind || 'product',
      id: item.id || '',
      name: item.name || '',
      planName: item.planName || '',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1
    })) : [],
    subtotal: Number(data.subtotal) || 0,
    discount: Number(data.discount) || 0,
    total: Number(data.total) || 0,
    currency: data.currency || 'HNL',
    paymentMethod: data.paymentMethod || '',
    device: data.device || '',
    notes: data.notes || '',
    estado: data.estado || 'pendiente',
    puntosOtorgados: Boolean(data.puntosOtorgados),
    pointsToAward: Number(data.pointsToAward) || 0,
    catalogVersion: Number(data.catalogVersion) || 0,
    createdAt: timestampToIso(data.createdAt),
    confirmedAt: timestampToIso(data.confirmedAt),
    cancelledAt: timestampToIso(data.cancelledAt)
  };
}

function publicClient(document) {
  const data = document.data();
  return {
    id: document.id,
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    fullName: [data.nombre, data.apellido].filter(Boolean).join(' ').trim(),
    telefono: data.telefono || '',
    correo: data.correo || '',
    fechaNacimiento: data.fechaNacimiento || '',
    avatar: data.avatar || '🦊',
    puntos: Number(data.puntos) || 0,
    createdAt: timestampToIso(data.createdAt),
    lastLoginAt: timestampToIso(data.lastLoginAt)
  };
}

async function loadOrders(limit) {
  const { db } = await firebaseServices();
  const snapshot = await db.collection('compras')
    .orderBy('createdAt', 'desc')
    .limit(Math.max(1, Math.min(300, Number(limit) || 150)))
    .get();
  return snapshot.docs.map(publicOrder);
}

async function loadClients(limit) {
  const { db } = await firebaseServices();
  const snapshot = await db.collection('clientes')
    .orderBy('createdAt', 'desc')
    .limit(Math.max(1, Math.min(500, Number(limit) || 300)))
    .get();
  return snapshot.docs.map(publicClient);
}

async function confirmOrder(orderId, actor) {
  const id = safeDocumentId(orderId, 'Pedido');
  const { db, FieldValue } = await firebaseServices();
  const orderReference = db.collection('compras').doc(id);
  const result = await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderReference);
    if (!orderSnapshot.exists) {
      const error = new Error('Pedido no encontrado.');
      error.code = 'NOT_FOUND';
      throw error;
    }
    const order = orderSnapshot.data();
    if (order.estado === 'cancelada') {
      const error = new Error('No se puede confirmar un pedido cancelado.');
      error.code = 'CONFLICT';
      throw error;
    }
    if (order.estado === 'confirmada') {
      return { alreadyConfirmed: true, pointsAwarded: 0 };
    }

    const configuredPoints = Number(order.pointsToAward);
    const points = Math.max(
      0,
      Math.min(1000, Number.isFinite(configuredPoints) ? configuredPoints : 10)
    );
    const clientReference = db.collection('clientes').doc(order.clienteId);
    const clientSnapshot = await transaction.get(clientReference);
    if (!clientSnapshot.exists) {
      const error = new Error('El cliente de este pedido ya no existe.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    transaction.update(orderReference, {
      estado: 'confirmada',
      puntosOtorgados: points > 0,
      pointsToAward: points,
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedBy: String(actor || 'admin').slice(0, 120)
    });
    if (points > 0) {
      transaction.update(clientReference, { puntos: FieldValue.increment(points) });
    }
    return { alreadyConfirmed: false, pointsAwarded: points };
  });

  if (!result.alreadyConfirmed) {
    const { tgMessage } = await import('./_lib/tg.js');
    await tgMessage(`✅ Pedido ${id} confirmado · +${result.pointsAwarded} pts al cliente.`);
  }
  return result;
}

async function cancelOrder(orderId, actor) {
  const id = safeDocumentId(orderId, 'Pedido');
  const { db, FieldValue } = await firebaseServices();
  const reference = db.collection('compras').doc(id);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) {
      const error = new Error('Pedido no encontrado.');
      error.code = 'NOT_FOUND';
      throw error;
    }
    const order = snapshot.data();
    if (order.estado === 'confirmada') {
      const error = new Error('Un pedido confirmado no puede cancelarse desde esta pantalla.');
      error.code = 'CONFLICT';
      throw error;
    }
    transaction.update(reference, {
      estado: 'cancelada',
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: String(actor || 'admin').slice(0, 120)
    });
  });
}

async function adjustClientPoints(clientId, delta, reason, actor) {
  const id = safeDocumentId(clientId, 'Cliente');
  const amount = Math.trunc(Number(delta));
  const cleanReason = String(reason || '').trim().slice(0, 240);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000 || cleanReason.length < 3) {
    const error = new Error('Indique un ajuste entre -1000 y 1000 puntos y escriba el motivo.');
    error.code = 'VALIDATION';
    throw error;
  }
  const { db, FieldValue } = await firebaseServices();
  const reference = db.collection('clientes').doc(id);
  const newBalance = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) {
      const error = new Error('Cliente no encontrado.');
      error.code = 'NOT_FOUND';
      throw error;
    }
    const current = Number(snapshot.data().puntos) || 0;
    const next = current + amount;
    if (next < 0) {
      const error = new Error('El ajuste dejaría un saldo negativo.');
      error.code = 'CONFLICT';
      throw error;
    }
    transaction.update(reference, {
      puntos: next,
      updatedAt: FieldValue.serverTimestamp()
    });
    const auditReference = db.collection('puntosHistorial').doc();
    transaction.set(auditReference, {
      clienteId: id,
      previousBalance: current,
      delta: amount,
      newBalance: next,
      reason: cleanReason,
      actor: String(actor || 'admin').slice(0, 120),
      createdAt: FieldValue.serverTimestamp()
    });
    return next;
  });
  return newBalance;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const body = bodyOf(req);
    const action = String(body.action || '');

    if (action === 'login') {
      if (!adminIsConfigured()) {
        return res.status(503).json({
          ok: false,
          error: 'Configure ADMIN_USER, ADMIN_PASS y ADMIN_SESSION_SECRET en Vercel.'
        });
      }
      if (!verifyAdminCredentials(body.user, body.password)) {
        return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
      }
      return res.status(200).json({
        ok: true,
        token: createAdminToken(body.user),
        user: String(body.user)
      });
    }

    const admin = adminFromRequest(req);
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'Sesión administrativa vencida.' });
    }

    if (action === 'load') {
      const snapshot = await loadCatalogSnapshot();
      return res.status(200).json({
        ok: true,
        catalog: snapshot.catalog,
        source: snapshot.source,
        warning: snapshot.warning || ''
      });
    }

    if (action === 'save') {
      const catalog = await saveCatalogSnapshot(body.catalog, admin.sub);
      return res.status(200).json({
        ok: true,
        catalog,
        message: 'Catálogo publicado correctamente.'
      });
    }

    if (action === 'history') {
      const history = await loadCatalogHistory(body.limit);
      return res.status(200).json({ ok: true, history });
    }

    if (action === 'orders') {
      const orders = await loadOrders(body.limit);
      return res.status(200).json({ ok: true, orders });
    }

    if (action === 'clients') {
      const clients = await loadClients(body.limit);
      return res.status(200).json({ ok: true, clients });
    }

    if (action === 'confirm-order') {
      const result = await confirmOrder(body.orderId, admin.sub);
      return res.status(200).json({
        ok: true,
        pointsAwarded: result.pointsAwarded,
        message: result.alreadyConfirmed
          ? 'El pedido ya estaba confirmado.'
          : `Pedido confirmado y ${result.pointsAwarded} puntos acreditados.`
      });
    }

    if (action === 'cancel-order') {
      await cancelOrder(body.orderId, admin.sub);
      return res.status(200).json({ ok: true, message: 'Pedido cancelado.' });
    }

    if (action === 'adjust-points') {
      const points = await adjustClientPoints(
        body.clientId,
        body.delta,
        body.reason,
        admin.sub
      );
      return res.status(200).json({
        ok: true,
        points,
        message: `Saldo actualizado: ${points} puntos.`
      });
    }

    return res.status(400).json({ ok: false, error: 'Acción administrativa no válida.' });
  } catch (error) {
    const statusByCode = {
      CATALOG_VALIDATION: 400,
      VALIDATION: 400,
      NOT_FOUND: 404,
      CONFLICT: 409
    };
    const status = statusByCode[error && error.code] || 500;
    return res.status(status).json({
      ok: false,
      error: String(error && error.message || error || 'Error interno.')
    });
  }
}
