const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { uploadsPath } = require('../content-paths');

const router = express.Router();
const REGIONS = new Set(['gdl', 'mty']);
const TYPES = new Set(['vacantes', 'portadas']);

function safeFilename(value) {
  const filename = path.basename(String(value || ''));
  return filename && filename === String(value) ? filename : '';
}

function resolveUploadPath(region, type, filename) {
  if (!REGIONS.has(region) || !TYPES.has(type)) return null;
  const safeName = safeFilename(filename);
  if (!safeName) return null;

  const target = path.resolve(uploadsPath(region, type, safeName));
  const root = path.resolve(uploadsPath(region, type));
  if (!target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

router.get('/media/:region/:type/:filename', async (req, res) => {
  const { region, type, filename } = req.params;
  const source = resolveUploadPath(region, type, filename);
  if (!source || !fs.existsSync(source)) {
    return res.status(404).end();
  }

  const width = Math.min(Math.max(parseInt(req.query.w, 10) || 640, 160), 1200);
  const quality = Math.min(Math.max(parseInt(req.query.q, 10) || 72, 45), 85);
  const cacheDir = path.join(path.dirname(source), '.cache');
  const cacheName = `${path.parse(filename).name}-${width}w-q${quality}.webp`;
  const cachePath = path.join(cacheDir, cacheName);

  try {
    fs.mkdirSync(cacheDir, { recursive: true });

    if (!fs.existsSync(cachePath) || fs.statSync(cachePath).mtimeMs < fs.statSync(source).mtimeMs) {
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(cachePath);
    }

    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(cachePath);
  } catch (err) {
    console.error('optimized media error:', err);
    res.sendFile(source);
  }
});

module.exports = router;
