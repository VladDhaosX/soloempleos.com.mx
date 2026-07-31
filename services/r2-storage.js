const fs = require('fs');
const path = require('path');

const REGIONS = new Set(['gdl', 'mty']);
const TYPE_PRESETS = Object.freeze({
  vacantes: Object.freeze(['thumb', 'full', 'admin']),
  portadas: Object.freeze(['cover']),
  cupones: Object.freeze(['thumb', 'full', 'admin']),
});
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const SAFE_BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

class R2ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'R2ConfigurationError';
    this.code = 'R2_CONFIGURATION_ERROR';
  }
}

class R2RequestError extends Error {
  constructor(operation, status) {
    super(`R2 ${operation} fallo con estado ${status}`);
    this.name = 'R2RequestError';
    this.code = 'R2_REQUEST_ERROR';
    this.status = status;
  }
}

function cleanBaseUrl(value) {
  const base = String(value || '').trim().replace(/\/+$/, '');
  return base.startsWith('https://') ? base : '';
}

function mediaKey(region, type, filename) {
  if (!REGIONS.has(region) || !TYPE_PRESETS[type] || !SAFE_FILENAME.test(String(filename || ''))) {
    throw new R2ConfigurationError('Ruta de imagen R2 no permitida');
  }
  return `${region}/${type}/${filename}`;
}

function encodedKey(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function readConfiguration(env) {
  const enabled = String(env.MEDIA_STORAGE || 'local').toLowerCase() === 'r2';
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const bucket = String(env.R2_BUCKET || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const deliveryBaseUrl = cleanBaseUrl(env.MEDIA_DELIVERY_BASE_URL);
  const endpoint = cleanBaseUrl(env.R2_ENDPOINT) ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return { enabled, accountId, bucket, accessKeyId, secretAccessKey, deliveryBaseUrl, endpoint };
}

function assertConfigured(config) {
  if (!config.enabled) throw new R2ConfigurationError('R2 no esta habilitado');
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new R2ConfigurationError('Faltan credenciales de R2');
  }
  if (!SAFE_BUCKET.test(config.bucket)) throw new R2ConfigurationError('Bucket R2 no valido');
  if (!config.endpoint || !config.deliveryBaseUrl) {
    throw new R2ConfigurationError('Falta el endpoint de R2 o la URL de entrega');
  }
}

function createR2Storage({ env = process.env, client = null } = {}) {
  const config = readConfiguration(env);
  let clientPromise;

  async function signedClient() {
    if (client) return client;
    if (!clientPromise) {
      clientPromise = import('aws4fetch').then(({ AwsClient }) => new AwsClient({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        service: 's3',
        region: 'auto',
      }));
    }
    return clientPromise;
  }

  function descriptor(region, type, filename) {
    assertConfigured(config);
    const key = mediaKey(region, type, filename);
    const pathKey = encodedKey(key);
    const urls = Object.fromEntries(
      TYPE_PRESETS[type].map(preset => [preset, `${config.deliveryBaseUrl}/${preset}/${pathKey}`])
    );
    return { provider: 'r2', key, urls };
  }

  async function uploadFile(file, region, type) {
    assertConfigured(config);
    if (!file?.path || !file.filename || !file.mimetype) {
      throw new R2ConfigurationError('Archivo temporal no valido');
    }

    const key = mediaKey(region, type, file.filename);
    const body = await fs.promises.readFile(file.path);
    const signer = await signedClient();
    const response = await signer.fetch(
      `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodedKey(key)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimetype,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body,
      }
    );
    if (!response.ok) throw new R2RequestError('upload', response.status);
    return descriptor(region, type, file.filename);
  }

  async function deleteMedia(media) {
    assertConfigured(config);
    if (!media || media.provider !== 'r2' || typeof media.key !== 'string') return false;

    const parts = media.key.split('/');
    if (parts.length !== 3) throw new R2ConfigurationError('Clave R2 no valida');
    const key = mediaKey(parts[0], parts[1], parts[2]);
    const signer = await signedClient();
    const response = await signer.fetch(
      `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodedKey(key)}`,
      { method: 'DELETE' }
    );
    if (!response.ok && response.status !== 404) throw new R2RequestError('delete', response.status);
    return true;
  }

  return {
    enabled: config.enabled,
    configured: config.enabled && Boolean(
      config.accountId && config.accessKeyId && config.secretAccessKey &&
      config.bucket && config.endpoint && config.deliveryBaseUrl
    ),
    descriptor,
    uploadFile,
    deleteMedia,
  };
}

module.exports = {
  R2ConfigurationError,
  R2RequestError,
  TYPE_PRESETS,
  createR2Storage,
  mediaKey,
};
