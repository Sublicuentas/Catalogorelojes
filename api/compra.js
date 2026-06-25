// api/compra.js
// Registra una compra (pendiente), descuenta los puntos usados, y manda a los admins
// por Telegram la captura + todos los detalles. Los +10 pts se dan al CONFIRMAR (api/admin.js).
import { db, FieldValue } from './_lib/firebase.js';
import { tgPhoto } from './_lib/tg.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      clienteId, producto, monto, perfil, dispositivo,
      metodo, puntosUsados = 0, comision = 0, total, comprobante
    } = b;

    if (!clienteId || !producto || !perfil || !dispositivo || !metodo)
      return res.status(400).json({ ok: false, error: 'Faltan datos de la compra.' });

    const cliRef = db.collection('clientes').doc(clienteId);

    // Transacción: validar puntos y descontar los usados
    const cliente = await db.runTransaction(async (t) => {
      const snap = await t.get(cliRef);
      if (!snap.exists) throw new Error('Cliente no encontrado.');
      const c = snap.data();
      const usar = Number(puntosUsados) || 0;
      if (usar > (c.puntos || 0)) throw new Error('No tenés suficientes puntos.');
      if (usar > 0) t.update(cliRef, { puntos: FieldValue.increment(-usar) });
      return c;
    });

    const compraRef = await db.collection('compras').add({
      clienteId,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
      telefono: cliente.telefono,
      producto, monto: Number(monto) || 0, perfil, dispositivo, metodo,
      puntosUsados: Number(puntosUsados) || 0,
      comision: Number(comision) || 0,
      total: Number(total) || 0,
      estado: 'pendiente',
      createdAt: FieldValue.serverTimestamp()
    });

    const caption =
      `🧾 *NUEVA COMPRA*\n\n` +
      `🛍️ ${producto}\n` +
      `👤 Perfil: ${perfil}\n` +
      `📺 Dispositivo: ${dispositivo}\n` +
      `🏦 Método: ${metodo}\n` +
      (puntosUsados > 0 ? `💎 Puntos usados: ${puntosUsados}\n` : '') +
      (comision > 0 ? `➕ Comisión 6.5%: L${comision}\n` : '') +
      `💰 *Total: L${total}*\n\n` +
      `🙋 Cliente: ${cliente.nombre} ${cliente.apellido} · ${cliente.telefono}\n` +
      `🆔 Compra: ${compraRef.id}`;

    await tgPhoto(comprobante, caption);

    return res.status(200).json({ ok: true, compraId: compraRef.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
