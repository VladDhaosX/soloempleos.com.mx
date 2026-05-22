const express = require('express');
const path = require('path');
const fs = require('fs');
const { ZipArchive } = require('archiver');
const multer = require('multer');
const unzipper = require('unzipper');
const requireAuth = require('../middleware/auth');
const { CONTENT_DIR, REGIONS, contentPath } = require('../content-paths');

const router = express.Router();
const RESTORE_ROOTS = new Set(['gdl/data', 'gdl/uploads', 'mty/data', 'mty/uploads']);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isZip = file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');
    if (!isZip) return cb(new Error('Solo se permite un archivo ZIP'));
    cb(null, true);
  },
  limits: { fileSize: 250 * 1024 * 1024 },
});

function addIfExists(archive, sourcePath, zipPath) {
  if (!fs.existsSync(sourcePath)) return;
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    addDirectory(archive, sourcePath, zipPath);
  } else {
    archive.file(sourcePath, { name: zipPath });
  }
}

function addDirectory(archive, sourcePath, zipPath) {
  for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
    if (entry.name === '.cache') continue;

    const sourceEntry = path.join(sourcePath, entry.name);
    const zipEntry = `${zipPath}/${entry.name}`;
    if (entry.isDirectory()) {
      addDirectory(archive, sourceEntry, zipEntry);
    } else if (entry.isFile()) {
      archive.file(sourceEntry, { name: zipEntry });
    }
  }
}

function normalizeZipPath(entryPath) {
  return String(entryPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .join('/');
}

function getRestoreRoot(zipPath) {
  const parts = zipPath.split('/');
  if (parts.length < 2) return null;
  const root = `${parts[0]}/${parts[1]}`;
  return RESTORE_ROOTS.has(root) ? root : null;
}

function resolveSafeTarget(zipPath) {
  const root = getRestoreRoot(zipPath);
  if (!root) return null;
  const target = path.resolve(CONTENT_DIR, zipPath);
  const contentRoot = path.resolve(CONTENT_DIR);
  if (target !== contentRoot && !target.startsWith(`${contentRoot}${path.sep}`)) {
    throw new Error('ZIP contiene rutas no permitidas');
  }
  return target;
}

async function readEntries(buffer) {
  const directory = await unzipper.Open.buffer(buffer);
  return directory.files.map(file => ({
    path: normalizeZipPath(file.path),
    type: file.type,
    file,
  })).filter(entry => entry.path);
}

function validateEntries(entries) {
  const files = entries.filter(entry => entry.type !== 'Directory' && getRestoreRoot(entry.path));
  if (!files.length) throw new Error('El ZIP no contiene archivos para restaurar');

  const invalid = entries.find(entry =>
    entry.type !== 'Directory' &&
    entry.path !== 'backup-manifest.json' &&
    !entry.path.startsWith('__MACOSX/') &&
    !resolveSafeTarget(entry.path)
  );
  if (invalid) throw new Error(`Ruta no permitida en ZIP: ${invalid.path}`);

  const roots = new Set(files.map(entry => getRestoreRoot(entry.path)).filter(Boolean));
  const hasData = [...roots].some(root => root.endsWith('/data'));
  const hasUploads = [...roots].some(root => root.endsWith('/uploads'));
  if (!hasData || !hasUploads) throw new Error('El ZIP debe incluir carpetas data y uploads');

  return { files, roots };
}

function clearRestoreRoots(roots) {
  const contentRoot = path.resolve(CONTENT_DIR);
  for (const root of roots) {
    const target = path.resolve(CONTENT_DIR, root);
    if (!target.startsWith(`${contentRoot}${path.sep}`)) throw new Error('Destino no permitido');
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
  }
}

router.get('/backup', requireAuth, (req, res) => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  const filename = `soloempleos-backup-${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ zlib: { level: 0 } });

  archive.on('error', err => {
    console.error('backup archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar backup' });
    } else {
      res.end();
    }
  });

  archive.pipe(res);

  for (const region of REGIONS) {
    addIfExists(archive, contentPath(region, 'data'), `${region}/data`);
    addIfExists(archive, contentPath(region, 'uploads'), `${region}/uploads`);
  }

  archive.append(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      includes: REGIONS.map(region => `${region}/data + ${region}/uploads`),
      restoreNote: 'Conserva esta estructura para restaurar JSON e imagenes despues de publicar.',
    }, null, 2),
    { name: 'backup-manifest.json' }
  );

  archive.finalize();
});

router.post('/backup/restore', requireAuth, upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio archivo ZIP' });
  }

  try {
    const entries = await readEntries(req.file.buffer);
    const { files, roots } = validateEntries(entries);

    clearRestoreRoots(roots);

    for (const entry of files) {
      const target = resolveSafeTarget(entry.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, await entry.file.buffer());
    }

    res.json({ ok: true, files: files.length, restored: [...roots].sort() });
  } catch (err) {
    console.error('backup restore error:', err);
    res.status(400).json({ error: err.message || 'No se pudo restaurar el backup' });
  }
});

module.exports = router;
