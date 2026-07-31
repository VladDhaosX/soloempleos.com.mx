const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const requireAuth = require('../middleware/auth');
const { dataPath, uploadsPath } = require('../content-paths');
const { createMediaStore } = require('../services/media-store');
const { defaultSitePublisher } = require('../services/static-site');
const {
  MIME_FORMATS,
  InvalidImageError,
  MediaQueueFullError,
  extensionForMime,
  prewarmFile,
  removeUploadedFiles,
  schedulePrewarm,
  validateUploadedImage,
} = require('../services/media-variants');

module.exports = function (region, options = {}) {
  const router = express.Router();
  const uploadDir = uploadsPath(region, 'cupones');
  const jsonPath = dataPath(region, 'cupones.json');
  const mediaStore = options.mediaStore || createMediaStore();
  const sitePublisher = options.sitePublisher || defaultSitePublisher;

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
    const withoutRotation = data.map(({ rotation, ...item }) => item);
    sitePublisher.writeJson(jsonPath, withoutRotation);
  }

  function newCupon(file, media = null) {
    return {
      id: randomUUID(),
      url: mediaStore.publicUrl(media, 'cupones') || `/${region}/uploads/cupones/${file.filename}`,
      fecha: new Date().toISOString().slice(0, 10),
      ...(media ? { media } : {}),
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

  async function removeStoredItem(item) {
    if (!item) return;
    try {
      await mediaStore.deleteItem(item, { uploadDir });
    } catch (err) {
      console.error('cupones cleanup error:', err);
    }
  }

  router.post('/cupones/replace-all', requireAuth, upload.array('imagenes', 200), async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No se recibieron imagenes' });

    const storedMedia = [];
    try {
      const metadata = [];
      for (const file of files) metadata.push(await validateUploadedImage(file));

      if (mediaStore.enabled) {
        for (let index = 0; index < files.length; index += 1) {
          storedMedia.push(await mediaStore.storeFile(files[index], region, 'cupones', metadata[index]));
        }
      }

      const existing = readCupones();
      const lista = files.map((file, index) => newCupon(file, storedMedia[index] || null));
      writeCupones(lista);
      const mediaJob = mediaStore.enabled ? null : schedulePrewarm(
        files.map(file => ({ region, type: 'cupones', filename: file.filename })),
        `cupones replace-all ${region}`
      );
      for (const item of existing) await removeStoredItem(item);

      res.json({ ok: true, total: lista.length, mediaJob });
    } catch (err) {
      await Promise.allSettled(storedMedia.filter(Boolean).map(media => mediaStore.deleteMedia(media)));
      removeUploadedFiles(files);
      respondImageError(res, err, 'cupones replace-all');
    }
  });

  router.post('/cupones', requireAuth, upload.single('imagen'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibio imagen' });

    let media = null;
    try {
      const metadata = await validateUploadedImage(req.file);
      media = await mediaStore.storeFile(req.file, region, 'cupones', metadata);
      if (!media) await prewarmFile(region, 'cupones', req.file.filename);

      const lista = readCupones();
      const item = newCupon(req.file, media);
      lista.unshift(item);
      writeCupones(lista);
      res.json(item);
    } catch (err) {
      if (media) await mediaStore.deleteMedia(media).catch(() => {});
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

  router.delete('/cupones/:id', requireAuth, async (req, res) => {
    try {
      const lista = readCupones();
      const item = lista.find(cupon => cupon.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Cupon no encontrado' });
      writeCupones(lista.filter(cupon => cupon.id !== req.params.id));
      await removeStoredItem(item);
      res.json({ ok: true });
    } catch (err) {
      console.error('cupones delete error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
