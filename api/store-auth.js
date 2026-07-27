import { db, FieldValue } from './_lib/firebase.js';
import {
  createStoreSession,
  destroyStoreSession,
  hashPassword,
  normalizeEmail,
  normalizePhone,
  storeClientFromRequest,
  verifyPassword
} from './_lib/store-session.js';
import { tgMessage } from './_lib/tg.js';

function bodyOf(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body || {};
}

function publicClient(id, data) {
  return {
    id,
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    fullName: [data.nombre, data.apellido].filter(Boolean).join(' ').trim(),
    telefono: data.telefono || '',
    correo: data.correo || '',
    fechaNacimiento: data.fechaNacimiento || '',
    avatar: data.avatar || '🦊',
    puntos: Number(data.puntos) || 0
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const body = bodyOf(req);
    const action = String(body.action || '');

    if (action === 'register') {
      const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
      const telefono = normalizePhone(body.phone);
      const correo = normalizeEmail(body.email);
      const fechaNacimiento = String(body.birthDate || '').trim();
      const password = String(body.password || '');

      if (fullName.length < 3 || telefono.length < 8 || !correo.includes('@') || !fechaNacimiento) {
        return res.status(400).json({ ok: false, error: 'Complete todos los datos del registro.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
      }

      const [emailSnapshot, phoneSnapshot] = await Promise.all([
        db.collection('clientes').where('correo', '==', correo).limit(1).get(),
        db.collection('clientes').where('telefono', '==', telefono).limit(1).get()
      ]);
      if (!emailSnapshot.empty || !phoneSnapshot.empty) {
        return res.status(409).json({
          ok: false,
          error: 'Ese correo o WhatsApp ya está registrado. Inicie sesión.'
        });
      }

      const names = fullName.split(' ');
      const nombre = names.shift();
      const apellido = names.join(' ');
      const credentials = await hashPassword(password);
      const reference = db.collection('clientes').doc();
      const data = {
        nombre,
        apellido,
        telefono,
        correo,
        fechaNacimiento,
        passwordHash: credentials.hash,
        passwordSalt: credentials.salt,
        authVersion: 2,
        avatar: '🦊',
        puntos: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      await reference.set(data);
      const session = await createStoreSession(reference.id);
      await tgMessage(`🆕 *NUEVO REGISTRO SUBLISTORE*\n\n👤 ${fullName}\n📱 +${telefono}\n📧 ${correo}`);
      return res.status(200).json({
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
        cliente: publicClient(reference.id, data)
      });
    }

    if (action === 'login') {
      const login = String(body.email || '').trim();
      const correo = login.includes('@') ? normalizeEmail(login) : '';
      const telefono = correo ? '' : normalizePhone(login);
      const password = String(body.password || '');
      if ((!correo && !telefono) || !password) {
        return res.status(400).json({ ok: false, error: 'Escriba su correo o WhatsApp y contraseña.' });
      }
      const snapshot = await db.collection('clientes')
        .where(correo ? 'correo' : 'telefono', '==', correo || telefono)
        .limit(1)
        .get();
      if (snapshot.empty) {
        return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
      }
      const document = snapshot.docs[0];
      const data = document.data();
      const hasCurrentPassword = Boolean(data.passwordSalt && data.passwordHash);
      const valid = hasCurrentPassword
        ? await verifyPassword(password, data.passwordSalt, data.passwordHash)
        : Boolean(data.pin && String(data.pin) === password);
      if (!valid) {
        return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
      }
      let migrated = false;
      if (!hasCurrentPassword) {
        const credentials = await hashPassword(password);
        await document.ref.update({
          passwordHash: credentials.hash,
          passwordSalt: credentials.salt,
          authVersion: 2,
          pin: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        });
        migrated = true;
      }
      const session = await createStoreSession(document.id);
      await document.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });
      return res.status(200).json({
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
        cliente: publicClient(document.id, data),
        migrated
      });
    }

    if (action === 'me') {
      const cliente = await storeClientFromRequest(req);
      if (!cliente) return res.status(401).json({ ok: false, error: 'Sesión vencida.' });
      return res.status(200).json({ ok: true, cliente });
    }

    if (action === 'logout') {
      await destroyStoreSession(req);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Acción no válida.' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error && error.message || error || 'Error interno.')
    });
  }
}
