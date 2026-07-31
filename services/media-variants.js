const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const sharp = require('sharp');
const { CONTENT_DIR, REGIONS, dataPath, uploadsPath } = require('../content-paths');

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_ACTIVE_TRANSFORMS = 1;
const MAX_PENDING_TRANSFORMS = 12;
const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MIME_FORMATS = Object.freeze({
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
});
const FORMAT_EXTENSIONS = Object.freeze({
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
});
const PRESETS = Object.freeze({
  thumb: Object.freeze({ width: 640, height: 1600, quality: 68 }),
  full: Object.freeze({ width: 1200, height: 3000, quality: 82 }),
  cover: Object.freeze({ width: 720, height: 1800, quality: 76 }),
  admin: Object.freeze({ width: 480, height: 1200, quality: 70 }),
});
const TYPE_PRESETS = Object.freeze({
  vacantes: Object.freeze(['thumb', 'full', 'admin']),
  portadas: Object.freeze(['cover']),
  cupones: Object.freeze(['thumb', 'full', 'admin']),
});
const DEFAULT_PRESETS = Object.freeze({
  vacantes: 'thumb',
  portadas: 'cover',
  cupones: 'thumb',
});
const VARIANT_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
const VARIANT_LOCK_STALE_MS = 2 * 60 * 1000;
const VARIANT_LOCK_WAIT_MS = 10 * 1000;
const PREWARM_LOCK_STALE_MS = 5 * 60 * 1000;

const inFlight = new Map();
const failedVariants = new Map();
const transformQueue = [];
let activeTransforms = 0;
let backgroundTail = Promise.resolve();
let backgroundJobId = 0;

// Limites globales para hosting compartido. UV_THREADPOOL_SIZE y
// MALLOC_ARENA_MAX se configuran antes de arrancar Node en Hostinger.
sharp.cache({ files: 0 });
sharp.concurrency(1);

class MediaQueueFullError extends Error {
  constructor() {
    super('La cola de procesamiento de imagenes esta llena');
    this.name = 'MediaQueueFullError';
    this.code = 'MEDIA_QUEUE_FULL';
  }
}

class InvalidImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidImageError';
    this.code = 'INVALID_IMAGE';
  }
}

function queueStats() {
  return {
    active: activeTransforms,
    pending: transformQueue.length,
    maxActive: MAX_ACTIVE_TRANSFORMS,
    maxPending: MAX_PENDING_TRANSFORMS,
    inFlight: inFlight.size,
  };
}

function drainTransformQueue() {
  while (activeTransforms < MAX_ACTIVE_TRANSFORMS && transformQueue.length) {
    const job = transformQueue.shift();
    activeTransforms += 1;

    Promise.resolve()
      .then(job.task)
      .then(job.resolve, job.reject)
      .finally(() => {
        activeTransforms -= 1;
        drainTransformQueue();
      });
  }
}

function enqueueTransform(task) {
  if (activeTransforms >= MAX_ACTIVE_TRANSFORMS && transformQueue.length >= MAX_PENDING_TRANSFORMS) {
    return Promise.reject(new MediaQueueFullError());
  }

  return new Promise((resolve, reject) => {
    transformQueue.push({ task, resolve, reject });
    drainTransformQueue();
  });
}

function tryAcquireFileLock(lockPath, staleAfterMs) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const token = `${process.pid}-${randomUUID()}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(fd, token);
      } finally {
        fs.closeSync(fd);
      }
      return token;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      let stale = false;
      try {
        stale = Date.now() - fs.statSync(lockPath).mtimeMs > staleAfterMs;
      } catch (statErr) {
        if (statErr.code === 'ENOENT') continue;
        throw statErr;
      }
      if (!stale || attempt > 0) return null;
      try {
        fs.unlinkSync(lockPath);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') return null;
      }
    }
  }
  return null;
}

function releaseFileLock(lockPath, token) {
  if (!token) return;
  try {
    if (fs.readFileSync(lockPath, 'utf8') === token) fs.unlinkSync(lockPath);
  } catch (_) {}
}

async function waitForSharedVariant(cachePath, lockPath) {
  const deadline = Date.now() + VARIANT_LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    if (fs.existsSync(cachePath)) return cachePath;
    if (!fs.existsSync(lockPath)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (fs.existsSync(cachePath)) return cachePath;

  const err = new Error('Otra instancia esta preparando la variante');
  err.code = 'MEDIA_VARIANT_LOCKED';
  throw err;
}

function isAllowedPreset(type, presetName) {
  return Boolean(TYPE_PRESETS[type] && TYPE_PRESETS[type].includes(presetName));
}

function safeFilename(value) {
  const original = String(value || '');
  const filename = path.basename(original);
  return filename && filename === original ? filename : '';
}

function resolveUploadPath(region, type, filename) {
  if (!REGIONS.includes(region) || !TYPE_PRESETS[type]) return null;
  if (type === 'cupones' && region !== 'gdl') return null;

  const safeName = safeFilename(filename);
  if (!safeName) return null;

  const root = path.resolve(uploadsPath(region, type));
  const target = path.resolve(root, safeName);
  if (!target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function mediaCacheKey(filename) {
  return createHash('sha256').update(filename).digest('hex').slice(0, 20);
}

function cachePathFor(source, filename, presetName) {
  const stat = fs.statSync(source);
  const cacheDir = path.join(path.dirname(source), '.cache');
  const sourceKey = mediaCacheKey(filename);
  const cacheName = `${sourceKey}-${stat.size}-${Math.floor(stat.mtimeMs)}-${presetName}.webp`;
  return { cacheDir, cachePath: path.join(cacheDir, cacheName) };
}

function removeStaleVariants(cacheDir, filename, presetName, currentPath) {
  if (!fs.existsSync(cacheDir)) return;
  const prefixes = [
    `${mediaCacheKey(filename)}-`,
    `${Buffer.from(filename).toString('hex')}-`,
  ];
  const suffix = `-${presetName}.webp`;
  for (const entry of fs.readdirSync(cacheDir, { withFileTypes: true })) {
    const entryPath = path.join(cacheDir, entry.name);
    if (
      entry.isFile() &&
      entryPath !== currentPath &&
      entry.name.endsWith(suffix) &&
      prefixes.some(prefix => entry.name.startsWith(prefix))
    ) {
      fs.unlinkSync(entryPath);
    }
  }
}

function existingVariantPath(source, filename, presetName) {
  const { cachePath } = cachePathFor(source, filename, presetName);
  return fs.existsSync(cachePath) ? cachePath : null;
}

async function createVariant(source, filename, presetName) {
  if (!isAllowedPreset(path.basename(path.dirname(source)), presetName)) {
    throw new InvalidImageError('Preset no permitido para este tipo de imagen');
  }

  const preset = PRESETS[presetName];
  const { cacheDir, cachePath } = cachePathFor(source, filename, presetName);
  if (fs.existsSync(cachePath)) return cachePath;

  const retryAfter = failedVariants.get(cachePath) || 0;
  if (retryAfter > Date.now()) {
    const err = new Error('Variante temporalmente en enfriamiento');
    err.code = 'MEDIA_VARIANT_COOLDOWN';
    throw err;
  }
  failedVariants.delete(cachePath);

  const pending = inFlight.get(cachePath);
  if (pending) return pending;

  const generation = enqueueTransform(async () => {
    fs.mkdirSync(cacheDir, { recursive: true });
    const lockPath = `${cachePath}.lock`;
    const lockToken = tryAcquireFileLock(lockPath, VARIANT_LOCK_STALE_MS);
    if (!lockToken) return waitForSharedVariant(cachePath, lockPath);
    const tempPath = path.join(cacheDir, `.${path.basename(cachePath)}.${randomUUID()}.tmp`);

    try {
      // Otra instancia pudo completar el archivo mientras este trabajo
      // esperaba su turno en la cola local.
      if (fs.existsSync(cachePath)) return cachePath;
      removeStaleVariants(cacheDir, filename, presetName, cachePath);
      await sharp(source, {
        failOn: 'warning',
        limitInputPixels: MAX_INPUT_PIXELS,
        pages: 1,
        sequentialRead: true,
      })
        .rotate()
        .resize({
          width: preset.width,
          height: preset.height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: preset.quality })
        .toFile(tempPath);
      fs.renameSync(tempPath, cachePath);
      return cachePath;
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (_) {}
      throw err;
    } finally {
      releaseFileLock(lockPath, lockToken);
    }
  });

  inFlight.set(cachePath, generation);
  try {
    const result = await generation;
    failedVariants.delete(cachePath);
    return result;
  } catch (err) {
    if (!(err instanceof MediaQueueFullError)) {
      failedVariants.set(cachePath, Date.now() + VARIANT_FAILURE_COOLDOWN_MS);
    }
    throw err;
  } finally {
    inFlight.delete(cachePath);
  }
}

async function validateUploadedImage(file) {
  if (!file || !file.path) throw new InvalidImageError('No se recibio una imagen valida');
  const expectedFormat = MIME_FORMATS[file.mimetype];
  if (!expectedFormat) throw new InvalidImageError('Formato de imagen no permitido');

  let metadata;
  try {
    metadata = await enqueueTransform(() => sharp(file.path, {
      failOn: 'warning',
      limitInputPixels: MAX_INPUT_PIXELS,
      pages: 1,
      sequentialRead: true,
    }).metadata());
  } catch (err) {
    if (err instanceof MediaQueueFullError) throw err;
    throw new InvalidImageError(`Imagen invalida o mayor a ${MAX_INPUT_PIXELS} pixeles`);
  }

  if (!SUPPORTED_FORMATS.has(metadata.format) || metadata.format !== expectedFormat) {
    throw new InvalidImageError('El contenido de la imagen no coincide con su formato');
  }
  if ((metadata.pages || 1) !== 1) {
    throw new InvalidImageError('No se permiten imagenes animadas o con varias paginas');
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new InvalidImageError(`La imagen supera el limite de ${MAX_INPUT_PIXELS} pixeles`);
  }

  const extension = FORMAT_EXTENSIONS[metadata.format];
  const currentExtension = path.extname(file.filename).toLowerCase();
  if (currentExtension !== extension) {
    const renamed = path.join(path.dirname(file.path), `${path.parse(file.filename).name}${extension}`);
    fs.renameSync(file.path, renamed);
    file.filename = path.basename(renamed);
    file.path = renamed;
  }

  return metadata;
}

async function prewarmFile(region, type, filename) {
  const source = resolveUploadPath(region, type, filename);
  if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new InvalidImageError('No se encontro la imagen para preparar');
  }

  const generated = [];
  for (const presetName of TYPE_PRESETS[type]) {
    generated.push(await createVariant(source, filename, presetName));
  }
  return generated;
}

async function prewarmItems(items) {
  const results = { generated: 0, failed: 0 };
  for (const item of items) {
    try {
      const generated = await prewarmFile(item.region, item.type, item.filename);
      results.generated += generated.length;
    } catch (err) {
      results.failed += 1;
      console.error(`media prewarm error (${item.region}/${item.type}/${item.filename}):`, err.message);
    }
  }
  return results;
}

function schedulePrewarm(items, label = 'media') {
  const unique = [];
  const seen = new Set();
  for (const item of items || []) {
    const key = `${item.region}/${item.type}/${item.filename}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const id = ++backgroundJobId;
  backgroundTail = backgroundTail
    .catch(() => {})
    .then(async () => {
      const result = await prewarmItems(unique);
      console.log(`media prewarm complete (${label} #${id}):`, result);
      return result;
    });
  return { id, files: unique.length };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function localMediaFilename(item) {
  const url = String(item?.url || '');
  if (!url || item?.media?.provider === 'r2' || /^https?:\/\//i.test(url)) return '';
  return path.basename(url.split(/[?#]/, 1)[0]);
}

function referencedMediaItems() {
  const items = [];
  for (const region of REGIONS) {
    const portada = readJson(dataPath(region, 'portada.json'), {});
    const portadaFilename = localMediaFilename(portada);
    if (portadaFilename) {
      items.push({ region, type: 'portadas', filename: portadaFilename });
    }

    const vacantes = readJson(dataPath(region, 'vacantes.json'), []);
    for (const item of Array.isArray(vacantes) ? vacantes : []) {
      const filename = localMediaFilename(item);
      if (filename) items.push({ region, type: 'vacantes', filename });
    }
  }

  const cupones = readJson(dataPath('gdl', 'cupones.json'), []);
  for (const item of Array.isArray(cupones) ? cupones : []) {
    const filename = localMediaFilename(item);
    if (filename) items.push({ region: 'gdl', type: 'cupones', filename });
  }
  return items;
}

function scheduleReferencedMediaWarmup(label = 'startup') {
  const lockPath = path.join(CONTENT_DIR, '.media-prewarm.lock');
  const lockToken = tryAcquireFileLock(lockPath, PREWARM_LOCK_STALE_MS);
  if (!lockToken) {
    return { id: null, files: 0, skipped: 'shared-lock-active' };
  }

  const job = schedulePrewarm(referencedMediaItems(), label);
  const scheduledWork = backgroundTail;
  scheduledWork.then(
    () => releaseFileLock(lockPath, lockToken),
    () => releaseFileLock(lockPath, lockToken)
  );
  return { ...job, sharedLock: true };
}

function waitForBackgroundWork() {
  return backgroundTail.catch(() => {});
}

function removeMediaArtifacts(source, filename = path.basename(source)) {
  const cacheDir = path.join(path.dirname(source), '.cache');
  const prefixes = [
    `${mediaCacheKey(filename)}-`,
    `${Buffer.from(filename).toString('hex')}-`,
  ];
  if (fs.existsSync(cacheDir)) {
    for (const entry of fs.readdirSync(cacheDir, { withFileTypes: true })) {
      if (entry.isFile() && prefixes.some(prefix => entry.name.startsWith(prefix))) {
        fs.unlinkSync(path.join(cacheDir, entry.name));
      }
    }
  }
  if (fs.existsSync(source)) fs.unlinkSync(source);
}

function removeUploadedFiles(files) {
  for (const file of files || []) {
    if (!file || !file.path) continue;
    try {
      removeMediaArtifacts(file.path, file.filename);
    } catch (_) {}
  }
}

function extensionForMime(mimetype) {
  const format = MIME_FORMATS[mimetype];
  return format ? FORMAT_EXTENSIONS[format] : '';
}

module.exports = {
  DEFAULT_PRESETS,
  MAX_INPUT_PIXELS,
  MIME_FORMATS,
  PRESETS,
  TYPE_PRESETS,
  InvalidImageError,
  MediaQueueFullError,
  createVariant,
  existingVariantPath,
  extensionForMime,
  isAllowedPreset,
  prewarmFile,
  queueStats,
  removeMediaArtifacts,
  removeUploadedFiles,
  resolveUploadPath,
  schedulePrewarm,
  scheduleReferencedMediaWarmup,
  validateUploadedImage,
  waitForBackgroundWork,
  __testing: {
    enqueueTransform,
    maxActiveTransforms: MAX_ACTIVE_TRANSFORMS,
    maxPendingTransforms: MAX_PENDING_TRANSFORMS,
    releaseFileLock,
    tryAcquireFileLock,
  },
};
