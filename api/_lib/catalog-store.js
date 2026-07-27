import { cloneDefaultCatalog } from './catalog-default.js';
import { normalizeCatalog, validateCatalog } from './catalog.js';

const COLLECTION = String(process.env.CATALOG_COLLECTION || 'catalogo').trim() || 'catalogo';
const DOCUMENT = String(process.env.CATALOG_DOCUMENT || 'publico').trim() || 'publico';

export function withDefaultProductImages(input) {
  const catalog = normalizeCatalog(input);
  const defaultImages = new Map(
    cloneDefaultCatalog().products.map((product) => [product.id, product.imageUrl || ''])
  );
  catalog.products = catalog.products.map((product) => ({
    ...product,
    imageUrl: product.imageUrl || defaultImages.get(product.id) || ''
  }));
  return catalog;
}

export function hasFirebaseConfiguration() {
  return Boolean(
    String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim() ||
    (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )
  );
}

async function getFirestore() {
  if (!hasFirebaseConfiguration()) {
    throw new Error('Firebase no está configurado todavía.');
  }
  const module = await import('./firebase.js');
  return { db: module.db, FieldValue: module.FieldValue };
}

export async function loadCatalogSnapshot() {
  if (!hasFirebaseConfiguration()) {
    return {
      catalog: withDefaultProductImages(cloneDefaultCatalog()),
      source: 'default',
      warning: 'Firebase no está configurado; se usa el catálogo base.'
    };
  }

  try {
    const { db } = await getFirestore();
    const snapshot = await db.collection(COLLECTION).doc(DOCUMENT).get();
    if (!snapshot.exists) {
      return {
        catalog: withDefaultProductImages(cloneDefaultCatalog()),
        source: 'default',
        warning: 'Aún no hay un catálogo publicado en Firebase.'
      };
    }
    return {
      catalog: withDefaultProductImages(snapshot.data()),
      source: 'firestore',
      warning: ''
    };
  } catch (error) {
    return {
      catalog: withDefaultProductImages(cloneDefaultCatalog()),
      source: 'default',
      warning: `No se pudo leer Firebase; se usa el respaldo: ${error.message || error}`
    };
  }
}

export async function saveCatalogSnapshot(input, actor = 'admin') {
  const result = validateCatalog(input);
  if (result.errors.length) {
    const error = new Error(result.errors.join('\n'));
    error.code = 'CATALOG_VALIDATION';
    throw error;
  }
  if (!hasFirebaseConfiguration()) {
    throw new Error('Configure Firebase en Vercel antes de publicar el catálogo.');
  }

  const { db, FieldValue } = await getFirestore();
  const reference = db.collection(COLLECTION).doc(DOCUMENT);
  const previousSnapshot = await reference.get();
  const previous = previousSnapshot.exists ? normalizeCatalog(previousSnapshot.data()) : null;
  const catalog = {
    ...withDefaultProductImages(result.catalog),
    catalogVersion: Math.max(
      Number(result.catalog.catalogVersion) || 1,
      Number(previous && previous.catalogVersion) || 0
    ) + 1,
    updatedAt: new Date().toISOString()
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(reference, catalog, { merge: false });
    const auditReference = db.collection('catalogoHistorial').doc();
    transaction.set(auditReference, {
      actor: String(actor || 'admin').slice(0, 120),
      catalogVersion: catalog.catalogVersion,
      productCount: catalog.products.length,
      promotionCount: catalog.promotions.length,
      previousVersion: previous ? previous.catalogVersion : null,
      createdAt: FieldValue.serverTimestamp()
    });
  });

  return catalog;
}

export async function loadCatalogHistory(limit = 30) {
  if (!hasFirebaseConfiguration()) return [];
  const { db } = await getFirestore();
  const snapshot = await db.collection('catalogoHistorial')
    .orderBy('createdAt', 'desc')
    .limit(Math.max(1, Math.min(100, Number(limit) || 30)))
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      actor: data.actor || '',
      catalogVersion: data.catalogVersion || 0,
      previousVersion: data.previousVersion || null,
      productCount: data.productCount || 0,
      promotionCount: data.promotionCount || 0,
      createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : ''
    };
  });
}
