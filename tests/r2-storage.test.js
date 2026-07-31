const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createR2Storage, mediaKey } = require('../services/r2-storage');

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-r2-'));
  const filePath = path.join(tempDir, 'imagen.jpg');
  fs.writeFileSync(filePath, Buffer.from([1, 2, 3, 4]));
  const calls = [];
  const client = {
    async fetch(url, options) {
      calls.push({ url, options });
      return new Response(null, { status: options.method === 'DELETE' ? 204 : 200 });
    },
  };
  const env = {
    MEDIA_STORAGE: 'r2',
    R2_ACCOUNT_ID: 'cuenta123',
    R2_BUCKET: 'soloempleos-media-prod',
    R2_ACCESS_KEY_ID: 'access-test',
    R2_SECRET_ACCESS_KEY: 'secret-test',
    MEDIA_DELIVERY_BASE_URL: 'https://soloempleos-images.example.workers.dev/',
  };

  try {
    assert.equal(mediaKey('gdl', 'vacantes', 'imagen.jpg'), 'gdl/vacantes/imagen.jpg');
    assert.throws(() => mediaKey('gdl', 'vacantes', '../imagen.jpg'), /no permitida/);

    const disabled = createR2Storage({ env: {} });
    assert.equal(disabled.enabled, false);
    assert.throws(() => disabled.descriptor('gdl', 'vacantes', 'imagen.jpg'), /no esta habilitado/);

    const storage = createR2Storage({ env, client });
    assert.equal(storage.configured, true);
    const media = await storage.uploadFile({
      path: filePath,
      filename: 'imagen.jpg',
      mimetype: 'image/jpeg',
    }, 'gdl', 'vacantes');

    assert.equal(media.provider, 'r2');
    assert.equal(media.key, 'gdl/vacantes/imagen.jpg');
    assert.equal(media.urls.thumb, 'https://soloempleos-images.example.workers.dev/thumb/gdl/vacantes/imagen.jpg');
    assert.equal(media.urls.full, 'https://soloempleos-images.example.workers.dev/full/gdl/vacantes/imagen.jpg');
    assert.equal(calls[0].options.method, 'PUT');
    assert.equal(calls[0].options.headers['Content-Type'], 'image/jpeg');
    assert.equal(Buffer.compare(calls[0].options.body, Buffer.from([1, 2, 3, 4])), 0);

    assert.equal(await storage.deleteMedia(media), true);
    assert.equal(calls[1].options.method, 'DELETE');
    assert.match(calls[1].url, /soloempleos-media-prod\/gdl\/vacantes\/imagen\.jpg$/);

    console.log('R2 storage: configuracion, carga, URLs fijas y eliminacion OK');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
