const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const requireAuth = require('../middleware/auth');
const { dataPath, uploadsPath } = require('../content-paths');
const { createMediaStore } = require('../services/media-store');
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
  const uploadDir = uploadsPath(region, 'vacantes');
  const jsonPath = dataPath(region, 'vacantes.json');
  const mediaStore = options.mediaStore || createMediaStore();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${randomUUID()}${extensionForMime(file.mimetype) || '.upload'}`);
    },
  });

  function imageFileFilter(req, file, cb) {
    if (!MIME_FORMATS[file.mimetype]) {
      return cb(new Error('Solo se permiten imagenes JPEG, PNG o WebP'));
    }
    cb(null, true);
  }

  const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  const uploadMany = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 200 },
  });

  function readVacantes() {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function writeVacantes(data) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
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
      console.error('vacantes cleanup error:', err);
    }
  }

  router.post('/vacantes/replace-all', requireAuth, uploadMany.array('imagenes', 200), async (req, res) => {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'No se recibieron imagenes' });
    }

    const storedMedia = [];
    try {
      const metadata = [];
      for (const file of files) metadata.push(await validateUploadedImage(file));

      if (mediaStore.enabled) {
        for (let index = 0; index < files.length; index += 1) {
          storedMedia.push(await mediaStore.storeFile(files[index], region, 'vacantes', metadata[index]));
        }
      }

      const existing = readVacantes();
      const now = new Date().toISOString().slice(0, 10);
      const lista = files.map((file, index) => {
        const media = storedMedia[index] || null;
        return {
          id: path.parse(file.filename).name,
          url: mediaStore.publicUrl(media, 'vacantes') || `/${region}/uploads/vacantes/${file.filename}`,
          fecha: now,
          rotation: 0,
          telefono: '',
          ...(media ? { media } : {}),
        };
      });

      writeVacantes(lista);
      const mediaJob = mediaStore.enabled ? null : schedulePrewarm(
        files.map(file => ({ region, type: 'vacantes', filename: file.filename })),
        `vacantes replace-all ${region}`
      );
      for (const item of existing) await removeStoredItem(item);

      res.json({ ok: true, total: lista.length, mediaJob });
    } catch (err) {
      await Promise.allSettled(storedMedia.filter(Boolean).map(media => mediaStore.deleteMedia(media)));
      removeUploadedFiles(files);
      respondImageError(res, err, 'vacantes replace-all');
    }
  });

  router.post('/vacantes', requireAuth, upload.single('imagen'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio imagen' });
    }

    let media = null;
    try {
      const metadata = await validateUploadedImage(req.file);
      media = await mediaStore.storeFile(req.file, region, 'vacantes', metadata);
      if (!media) await prewarmFile(region, 'vacantes', req.file.filename);

      const id = path.parse(req.file.filename).name;
      const url = mediaStore.publicUrl(media, 'vacantes') || `/${region}/uploads/vacantes/${req.file.filename}`;
      const now = new Date().toISOString().slice(0, 10);
      const lista = readVacantes();
      const item = { id, url, fecha: now, rotation: 0, telefono: '', ...(media ? { media } : {}) };
      lista.unshift(item);
      writeVacantes(lista);
      res.json(item);
    } catch (err) {
      if (media) await mediaStore.deleteMedia(media).catch(() => {});
      removeUploadedFiles([req.file]);
      respondImageError(res, err, 'vacantes write');
    }
  });

  router.put('/vacantes/reorder', requireAuth, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids debe ser un array' });
    }
    try {
      const lista = readVacantes();
      const map = Object.fromEntries(lista.map(item => [item.id, item]));
      const reordered = ids.map(id => map[id]).filter(Boolean);
      const included = new Set(ids);
      writeVacantes([...reordered, ...lista.filter(item => !included.has(item.id))]);
      res.json({ ok: true });
    } catch (err) {
      console.error('vacantes reorder error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.put('/vacantes/:id/rotate', requireAuth, (req, res) => {
    try {
      const lista = readVacantes();
      const item = lista.find(vacante => vacante.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Vacante no encontrada' });
      item.rotation = ((item.rotation || 0) + 90) % 360;
      writeVacantes(lista);
      res.json({ ok: true, rotation: item.rotation });
    } catch (err) {
      console.error('vacantes rotate error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.put('/vacantes/:id/telefono', requireAuth, (req, res) => {
    const telefono = String(req.body.telefono || '').trim();
    if (telefono.length > 30) {
      return res.status(400).json({ error: 'El numero no debe exceder 30 caracteres' });
    }
    try {
      const lista = readVacantes();
      const item = lista.find(vacante => vacante.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Vacante no encontrada' });
      item.telefono = telefono;
      writeVacantes(lista);
      res.json({ ok: true, telefono });
    } catch (err) {
      console.error('vacantes telefono error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.delete('/vacantes/:id', requireAuth, async (req, res) => {
    try {
      const lista = readVacantes();
      const item = lista.find(vacante => vacante.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Vacante no encontrada' });

      writeVacantes(lista.filter(vacante => vacante.id !== req.params.id));
      await removeStoredItem(item);
      res.json({ ok: true });
    } catch (err) {
      console.error('vacantes delete error:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
