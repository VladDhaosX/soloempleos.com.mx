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
  schedulePrewarm,
  validateUploadedImage,
} = require('../services/media-variants');

module.exports = function (region) {
  const router = express.Router();
  const uploadDir = uploadsPath(region, 'cupones');
  const jsonPath = dataPath(region, 'cupones.json');

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${extensionForMime(file.mimetype) || '.upload'}`);
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
    limits: { fileSize: 10 * 1024 * 1024, files: 200 },
  });

  function readCupones() {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function writeCupones(data) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  }

  function newCupon(file) {
    return {
      id: randomUUID(),
      url: `/${region}/uploads/cupones/${file.filename}`,
      fecha: new Date().toISOString().slice(0, 10),
      rotation: 0,
    };
  }

  function respondImageError(res, err, context) {
    if (err instanceof InvalidImageError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof MediaQueueFullError) {
      res.set('Retry-After', '5');
      return res.status(503).json({ error: 'Procesamiento de imagenes ocupado; intenta de nuevo' });
    }
    console.error(`${context} error:`, err);
    return res.status(500).json({ error: 'Error interno' });
  }

  function removeStoredItem(item) {
    if (!item || !item.url) return;
    const filename = path.basename(item.url);
    try {
      removeMediaArtifacts(path.join(uploadDir, filename), filename);
    } catch (err) {
      console.error('cupones cleanup error:', err);
    }
  }

  router.post('/cupones/replace-all', requireAuth, upload.array('imagenes', 200), async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No se recibieron imagenes' });

    try {
      for (const file of files) await validateUploadedImage(file);

      const existing = readCupones();
      const lista = files.map(newCupon);
      writeCupones(lista);
      const mediaJob = schedulePrewarm(
        files.map(file => ({ region, type: 'cupones', filename: file.filename })),
        `cupones replace-all ${region}`
      );
      for (const item of existing) removeStoredItem(item);

      res.json({ ok: true, total: lista.length, mediaJob });
    } catch (err) {
      removeUploadedFiles(files);
      respondImageError(res, err, 'cupones replace-all');
    }
  });

  router.post('/cupones', requireAuth, upload.single('imagen'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibio imagen' });

    try {
      await validateUploadedImage(req.file);
      await prewarmFile(region, 'cupones', req.file.filename);

      const lista = readCupones();
      const item = newCupon(req.file);
      lista.unshift(item);
      writeCupones(lista);
      res.json(item);
    } catch (err) {
      removeUploadedFiles([req.file]);
      respondImageError(res, err, 'cupones write');
    }
  });

  router.put('/cupones/reorder', requireAuth, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids debe ser un array' });
    try {
      const lista = readCupones();
      const map = new Map(lista.map(item => [item.id, item]));
      const reordered = ids.map(id => map.get(id)).filter(Boolean);
      const included = new Set(ids);
      writeCupones([...reordered, ...lista.filter(item => !included.has(item.id))]);
      res.json({ ok: true });
    } catch (err) {
      console.error('cupones reorder error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.put('/cupones/:id/rotate', requireAuth, (req, res) => {
    try {
      const lista = readCupones();
      const item = lista.find(cupon => cupon.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Cupon no encontrado' });
      item.rotation = ((item.rotation || 0) + 90) % 360;
      writeCupones(lista);
      res.json({ ok: true, rotation: item.rotation });
    } catch (err) {
      console.error('cupones rotate error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.delete('/cupones/:id', requireAuth, (req, res) => {
    try {
      const lista = readCupones();
      const item = lista.find(cupon => cupon.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Cupon no encontrado' });
      writeCupones(lista.filter(cupon => cupon.id !== req.params.id));
      removeStoredItem(item);
      res.json({ ok: true });
    } catch (err) {
      console.error('cupones delete error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
