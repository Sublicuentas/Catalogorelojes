// api/registro.js
// Registra un cliente nuevo. Guarda en Firestore y avisa a los admins por Telegram.
import { db, FieldValue } from './_lib/firebase.js';
import { tgMessage } from './_lib/tg.js';

const norm = (s) => (s || '').replace(/\D/g, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { nombre, apellido, telefono, correo, pin, avatar } = b;
    if (!nombre || !apellido || !telefono || !correo)
      return res.status(400).json({ ok: false, error: 'Faltan datos (nombre, apellido, teléfono, correo).' });

    // ¿ya existe ese teléfono o correo?
    const tel = norm(telefono);
    const dup = await db.collection('clientes')
      .where('telefono', '==', tel).limit(1).get();
    if (!dup.empty)
      return res.status(409).json({ ok: false, error: 'Ese teléfono ya está registrado. Iniciá sesión.' });

    const ref = await db.collection('clientes').add({
      nombre, apellido,
      telefono: tel,
      correo: (correo || '').toLowerCase(),
      pin: pin || null,
      avatar: avatar || '🦊',
      puntos: 0,
      createdAt: FieldValue.serverTimestamp()
    });

    await tgMessage(
      `🆕 *NUEVO REGISTRO*\n\n👤 ${nombre} ${apellido}\n📱 ${telefono}\n📧 ${correo}`
    );

    return res.status(200).json({
      ok: true,
      cliente: { id: ref.id, nombre, apellido, telefono: tel, correo, avatar: avatar || '🦊', puntos: 0 }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
