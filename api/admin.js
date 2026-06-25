// api/admin.js
// Panel admin. Verifica usuario+clave contra variables de entorno (ADMIN_USER / ADMIN_PASS).
// Acciones: login, clientes, cliente, confirmar (confirma compra y da +10 pts).
import { db, FieldValue } from './_lib/firebase.js';
import { tgMessage } from './_lib/tg.js';

function okAdmin(b) {
  return b && b.user === process.env.ADMIN_USER && b.pass === process.env.ADMIN_PASS;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!okAdmin(b)) return res.status(401).json({ ok: false, error: 'Usuario o clave incorrectos.' });

    const action = b.action;

    if (action === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'clientes') {
      const snap = await db.collection('clientes').orderBy('createdAt', 'desc').limit(500).get();
      const clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ ok: true, clientes });
    }

    if (action === 'cliente') {
      const cliSnap = await db.collection('clientes').doc(b.clienteId).get();
      const compras = await db.collection('compras')
        .where('clienteId', '==', b.clienteId).orderBy('createdAt', 'desc').get();
      return res.status(200).json({
        ok: true,
        cliente: { id: cliSnap.id, ...cliSnap.data() },
        compras: compras.docs.map(d => ({ id: d.id, ...d.data() }))
      });
    }

    // Confirma una compra y da +10 pts al cliente (puntos solo se ganan acá)
    if (action === 'confirmar') {
      const compraRef = db.collection('compras').doc(b.compraId);
      await db.runTransaction(async (t) => {
        const cs = await t.get(compraRef);
        if (!cs.exists) throw new Error('Compra no encontrada.');
        const compra = cs.data();
        if (compra.estado === 'confirmada') return;
        t.update(compraRef, { estado: 'confirmada' });
        t.update(db.collection('clientes').doc(compra.clienteId), { puntos: FieldValue.increment(10) });
      });
      await tgMessage(`✅ Compra ${b.compraId} confirmada · +10 pts al cliente.`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Acción no válida.' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
