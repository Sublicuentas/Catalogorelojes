import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { verifyPassword, generateToken } from '../../lib/auth';

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
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: '❌ Faltan campos requeridos' });
    }

    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (userSnapshot.empty) {
      return res.status(401).json({ success: false, message: '❌ Usuario no encontrado' });
    }

    const user = userSnapshot.docs[0].data();
    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);

    if (!isValid) {
      return res.status(401).json({ success: false, message: '❌ Contraseña incorrecta' });
    }

    const token = generateToken();
    await db.collection('sessions').doc(token).set({
      uid: user.uid,
      phone,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await db.collection('users').doc(user.uid).update({
      lastLogin: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: '✅ Acceso correcto',
      token,
      user: { name: user.name, phone: user.phone, countryName: user.countryName },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '❌ Error en el servidor' });
  }
}
