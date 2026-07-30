const express = require('express');
const fs = require('fs');
const {
  DEFAULT_PRESETS,
  PRESETS,
  MediaQueueFullError,
  createVariant,
  existingVariantPath,
  isAllowedPreset,
  queueStats,
  resolveUploadPath,
} = require('../services/media-variants');

const router = express.Router();

router.get('/media/:region/:type/:filename', async (req, res) => {
  const { region, type, filename } = req.params;
  const queryKeys = Object.keys(req.query);
  if (queryKeys.some(key => key !== 'preset') || Array.isArray(req.query.preset)) {
    return res.status(400).json({ error: 'Solo se permite el parametro preset' });
  }

  const presetName = String(req.query.preset || DEFAULT_PRESETS[type] || '');
  if (!Object.prototype.hasOwnProperty.call(PRESETS, presetName) || !isAllowedPreset(type, presetName)) {
    return res.status(400).json({ error: 'Preset de imagen no permitido para este tipo' });
  }

  const source = resolveUploadPath(region, type, filename);
  if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) {
    return res.status(404).end();
  }

  try {
    // Las cargas nuevas y el calentamiento de arranque dejan este archivo listo.
    // La generacion bajo demanda queda solo como recuperacion acotada.
    const optimized = existingVariantPath(source, filename, presetName) ||
      await createVariant(source, filename, presetName);
    res.type('image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(optimized);
  } catch (err) {
    if (err instanceof MediaQueueFullError) {
      res.set('Cache-Control', 'no-store');
      res.set('Retry-After', '5');
      return res.status(503).json({ error: 'Imagen temporalmente no disponible' });
    }

    if (err.code !== 'MEDIA_VARIANT_COOLDOWN') {
      console.error('optimized media error:', err);
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.sendFile(source);
  }
});

router.PRESETS = PRESETS;
router.queueStats = queueStats;
module.exports = router;
