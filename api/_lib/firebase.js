// Inicializa Firebase Admin una sola vez.
// Acepta FIREBASE_SERVICE_ACCOUNT (JSON completo) o las tres variables
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
import admin from 'firebase-admin';

if (!admin.apps.length) {
  let serviceAccount = null;
  const rawServiceAccount = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();

  if (rawServiceAccount) {
    serviceAccount = JSON.parse(rawServiceAccount);
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n')
    };
  }

  if (!serviceAccount) {
    throw new Error(
      'Falta configurar Firebase: use FIREBASE_SERVICE_ACCOUNT o las variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined
  });
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const firebaseAdmin = admin;
