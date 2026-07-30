const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const requireAuth = require('../middleware/auth');
const { dataPath, uploadsPath } = require('../content-paths');
const {
  MIME_FORMATS,
  InvalidImageError,
  MediaQueueFullError,
  extensionForMime,
  prewarmFile,
  removeMediaArtifacts,
  removeUploadedFiles,
  validateUploadedImage,
} = require('../services/media-variants');

module.exports = function (region) {
  const router = express.Router();
  const uploadDir = uploadsPath(region, 'portadas');

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${randomUUID()}${extensionForMime(file.mimetype) || '.upload'}`);
    },
  });

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (!MIME_FORMATS[file.mimetype]) {
        return cb(new Error('Solo se permiten imagenes JPEG, PNG o WebP'));
      }
      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  router.post('/portada', requireAuth, upload.single('imagen'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio imagen' });
    }

    const jsonPath = dataPath(region, 'portada.json');
    let previous = {};
    try {
      previous = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (_) {}

    try {
      await validateUploadedImage(req.file);
      await prewarmFile(region, 'portadas', req.file.filename);

      const version = path.parse(req.file.filename).name;
      const url = `/${region}/uploads/portadas/${req.file.filename}`;
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify({ url, version }, null, 2));

      if (previous.url && path.basename(previous.url) !== req.file.filename) {
        const previousName = path.basename(previous.url);
        removeMediaArtifacts(path.join(uploadDir, previousName), previousName);
      }
      res.json({ url });
    } catch (err) {
      removeUploadedFiles([req.file]);
      if (err instanceof InvalidImageError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof MediaQueueFullError) {
        res.set('Retry-After', '5');
        return res.status(503).json({ error: 'Procesamiento de imagenes ocupado; intenta de nuevo' });
      }
      console.error('portada write error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
