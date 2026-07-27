import crypto from 'crypto';

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function secret() {
  return String(process.env.ADMIN_SESSION_SECRET || '');
}

export function adminIsConfigured() {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASS && secret());
}

export function verifyAdminCredentials(user, password) {
  if (!adminIsConfigured()) return false;
  return safeEqual(user, process.env.ADMIN_USER) && safeEqual(password, process.env.ADMIN_PASS);
}

export function createAdminToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: String(user || 'admin'),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token) {
  try {
    if (!token || !secret()) return null;
    const [payload, signature] = String(token).split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

export function adminFromRequest(req) {
  const authorization = String(req.headers && req.headers.authorization || '');
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  return verifyAdminToken(token);
}
