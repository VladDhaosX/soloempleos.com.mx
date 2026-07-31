const path = require('path');
const { createR2Storage } = require('./r2-storage');
const { removeMediaArtifacts, removeUploadedFiles } = require('./media-variants');

const DEFAULT_PRESET = Object.freeze({
  vacantes: 'full',
  portadas: 'cover',
  cupones: 'full',
});

function mediaDimensions(metadata) {
  const width = Number(metadata?.width);
  const height = Number(metadata?.height);
  return Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0
    ? { width, height }
    : {};
}

function createMediaStore({ env = process.env, r2Storage = null } = {}) {
  const r2 = r2Storage || createR2Storage({ env });

  async function storeFile(file, region, type, metadata) {
    if (!r2.enabled) return null;

    const descriptor = await r2.uploadFile(file, region, type);
    const media = { ...descriptor, ...mediaDimensions(metadata) };
    removeUploadedFiles([file]);
    return media;
  }

  function publicUrl(media, type) {
    if (!media || media.provider !== 'r2') return '';
    const preset = DEFAULT_PRESET[type];
    return preset ? String(media.urls?.[preset] || '') : '';
  }

  async function deleteItem(item, { uploadDir } = {}) {
    if (item?.media?.provider === 'r2') {
      return r2.deleteMedia(item.media);
    }

    if (!item?.url || !uploadDir) return false;
    const filename = path.basename(item.url);
    removeMediaArtifacts(path.join(uploadDir, filename), filename);
    return true;
  }

  async function deleteMedia(media) {
    if (!media || media.provider !== 'r2') return false;
    return r2.deleteMedia(media);
  }

  return {
    enabled: r2.enabled,
    configured: r2.configured,
    deleteItem,
    deleteMedia,
    publicUrl,
    storeFile,
  };
}

module.exports = { DEFAULT_PRESET, createMediaStore };
