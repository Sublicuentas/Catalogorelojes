import { randomBytes } from 'node:crypto';
import { loadCatalogSnapshot, saveCatalogSnapshot, loadCatalogHistory } from './_lib/catalog-store.js';

function secretOf(req) {
  return String(req.headers['x-catalog-sync-secret'] || '').trim();
}

function projectIdFromEnv() {
  if (process.env.FIREBASE_PROJECT_ID) return String(process.env.FIREBASE_PROJECT_ID).trim();
  try {
    const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed.project_id || parsed.projectId || '').trim();
  } catch (error) {
    return '';
  }
}

function uploadExtension(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function storageCandidates(firebaseAdmin) {
  const projectId = projectIdFromEnv();
  const appBucket = String(firebaseAdmin.app().options.storageBucket || '').trim();
  return [...new Set([
    appBucket,
    String(process.env.FIREBASE_STORAGE_BUCKET || '').trim(),
    String(process.env.CATALOGO_STORAGE_BUCKET || '').trim(),
    projectId ? `${projectId}.firebasestorage.app` : '',
    projectId ? `${projectId}.appspot.com` : ''
  ].filter(Boolean))];
}

async function uploadCatalogImage(body) {
  const mime = String(body.mime || '').trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    throw new Error('Formato de imagen no permitido. Use JPG, PNG o WebP.');
  }
  const base64 = String(body.base64 || '')
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  if (!base64) throw new Error('La imagen llegó vacía.');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
    throw new Error('La imagen debe pesar menos de 3 MB después de optimizarse.');
  }
  const kind = String(body.kind || '').trim() === 'product' ? 'productos' : 'carrusel';
  const token = randomBytes(18).toString('hex');
  const path = `catalogo/${kind}/${Date.now()}-${token.slice(0, 12)}.${uploadExtension(mime)}`;
  const { firebaseAdmin } = await import('./_lib/firebase.js');
  const candidates = storageCandidates(firebaseAdmin);
  if (!candidates.length) throw new Error('Falta configurar FIREBASE_STORAGE_BUCKET del catálogo.');

  let lastError = null;
  for (const bucketName of candidates) {
    try {
      const bucket = firebaseAdmin.storage().bucket(bucketName);
      const file = bucket.file(path);
      await file.save(buffer, {
        resumable: false,
        validation: false,
        metadata: {
          contentType: mime,
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: { firebaseStorageDownloadTokens: token }
        }
      });
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`;
      return { imageUrl, path, bucket: bucket.name };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`No se pudo subir la imagen a Firebase Storage. ${String(lastError && lastError.message || 'Revise el bucket configurado.')}`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  const configured = String(process.env.CATALOGO_SYNC_SECRET || '').trim();
  if (!configured) return res.status(503).json({ ok: false, error: 'Falta CATALOGO_SYNC_SECRET en el catálogo.' });
  if (secretOf(req) !== configured) return res.status(401).json({ ok: false, error: 'Clave de sincronización inválida.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'load') {
      const [snapshot, history] = await Promise.all([loadCatalogSnapshot(), loadCatalogHistory(15)]);
      return res.status(200).json({ ok: true, catalog: snapshot.catalog, history, source: snapshot.source });
    }

    if (action === 'save') {
      const actor = String(body.actor || 'sublichat').slice(0, 120);
      const catalog = await saveCatalogSnapshot(body.catalog || {}, actor);
      return res.status(200).json({ ok: true, catalog, message: `Catálogo publicado · versión ${catalog.catalogVersion}` });
    }

    if (action === 'upload_image') {
      const uploaded = await uploadCatalogImage(body);
      return res.status(200).json({ ok: true, ...uploaded });
    }

    return res.status(400).json({ ok: false, error: 'Acción no válida.' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error && error.message || error || 'Error interno.') });
  }
}
