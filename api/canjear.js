// api/canjear.js
// Canjea puntos por una app gratis. Descuenta los puntos (transacción) y avisa a los admins.
import { db, FieldValue } from './_lib/firebase.js';
import { tgMessage } from './_lib/tg.js';

// Costos OFICIALES de canje (los que definiste). El servidor manda, no el navegador.
const CANJE = {
  'Vix Premium': 60,
  'Deezer Premium': 50,
  'Canva Edu Pro': 40,
  'Disney Standard': 60,
  'Mubi Premium': 30
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { clienteId, app } = b;
    const costo = CANJE[app];
    if (!clienteId || !costo) return res.status(400).json({ ok: false, error: 'App o cliente inválido.' });

    const cliRef = db.collection('clientes').doc(clienteId);
    const cliente = await db.runTransaction(async (t) => {
      const snap = await t.get(cliRef);
      if (!snap.exists) throw new Error('Cliente no encontrado.');
      const c = snap.data();
      if ((c.puntos || 0) < costo) throw new Error('No tenés suficientes puntos.');
      t.update(cliRef, { puntos: FieldValue.increment(-costo) });
      return c;
    });

    await db.collection('canjes').add({
      clienteId, clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
      app, costo, estado: 'pendiente', createdAt: FieldValue.serverTimestamp()
    });

    await tgMessage(
      `🎁 *CANJE DE PUNTOS*\n\n${cliente.nombre} ${cliente.apellido} (${cliente.telefono})\nCanjeó *${app}* por *${costo} pts*.\nActivar 1 mes gratis.`
    );

    return res.status(200).json({ ok: true, puntos: (cliente.puntos || 0) - costo });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
