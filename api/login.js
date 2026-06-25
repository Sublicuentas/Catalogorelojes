// api/login.js
// Inicia sesión por teléfono o correo (+ PIN si lo puso). Devuelve los datos y puntos.
import { db } from './_lib/firebase.js';

const norm = (s) => (s || '').replace(/\D/g, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { id, pin } = b; // id = teléfono o correo
    if (!id) return res.status(400).json({ ok: false, error: 'Escribí tu teléfono o correo.' });

    const col = db.collection('clientes');
    let snap;
    if (id.includes('@')) {
      snap = await col.where('correo', '==', id.toLowerCase()).limit(1).get();
    } else {
      snap = await col.where('telefono', '==', norm(id)).limit(1).get();
    }
    if (snap.empty) return res.status(404).json({ ok: false, error: 'No encontramos esa cuenta. Registrate.' });

    const doc = snap.docs[0];
    const c = doc.data();
    if (c.pin && c.pin !== (pin || '')) return res.status(401).json({ ok: false, error: 'PIN incorrecto.' });

    return res.status(200).json({
      ok: true,
      cliente: { id: doc.id, nombre: c.nombre, apellido: c.apellido, telefono: c.telefono, correo: c.correo, avatar: c.avatar || '🦊', puntos: c.puntos || 0 }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
