import crypto from 'crypto';
import { promisify } from 'util';
import { db, FieldValue } from './firebase.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;

export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(String(password), salt, 64);
  return { salt, hash: Buffer.from(derived).toString('hex') };
}

export async function verifyPassword(password, salt, storedHash) {
  if (!salt || !storedHash) return false;
  const result = await hashPassword(password, salt);
  const left = Buffer.from(result.hash, 'hex');
  const right = Buffer.from(String(storedHash), 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export async function createStoreSession(clienteId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.collection('storeSessions').doc(tokenHash(token)).set({
    clienteId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function storeClientFromRequest(req) {
  const authorization = String(req.headers && req.headers.authorization || '');
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const sessionReference = db.collection('storeSessions').doc(tokenHash(token));
  const sessionSnapshot = await sessionReference.get();
  if (!sessionSnapshot.exists) return null;
  const session = sessionSnapshot.data();
  const expiresAt = session.expiresAt && typeof session.expiresAt.toDate === 'function'
    ? session.expiresAt.toDate()
    : new Date(session.expiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    await sessionReference.delete().catch(() => {});
    return null;
  }
  const clientSnapshot = await db.collection('clientes').doc(session.clienteId).get();
  if (!clientSnapshot.exists) return null;
  const data = clientSnapshot.data();
  return {
    id: clientSnapshot.id,
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

export async function destroyStoreSession(req) {
  const authorization = String(req.headers && req.headers.authorization || '');
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return;
  await db.collection('storeSessions').doc(tokenHash(token)).delete().catch(() => {});
}
