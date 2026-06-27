import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { hashPassword } from '../../lib/auth';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  });
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, countryCode, countryName, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: '❌ Faltan campos requeridos' });
    }

    if (name.length < 3) {
      return res.status(400).json({ success: false, message: '❌ Nombre muy corto' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '❌ Clave muy corta' });
    }

    const existingUser = await db.collection('users').where('phone', '==', phone).get();
    if (!existingUser.empty) {
      return res.status(400).json({ success: false, message: '❌ Este número ya está registrado' });
    }

    const { hash, salt } = hashPassword(password);
    const uid = phone.replace(/\D/g, '');

    const userDoc = {
      uid,
      name,
      phone,
      countryCode,
      countryName,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      points: 0,
      verified: false,
    };

    await db.collection('users').doc(uid).set(userDoc);

    return res.status(200).json({
      success: true,
      message: '✅ Cuenta creada exitosamente',
      user: { name, phone, countryName },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: '❌ Error en el servidor' });
  }
}
