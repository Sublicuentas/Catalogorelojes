// api/_lib/firebase.js
// Inicializa Firebase Admin UNA sola vez usando la cuenta de servicio
// guardada en la variable de entorno FIREBASE_SERVICE_ACCOUNT (el JSON completo).
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
