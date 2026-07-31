const assert = require('assert');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-r2-routes-'));
process.env.CONTENT_DIR = tempDir;
process.env.JWT_SECRET = 'r2-routes-test-secret';

const deletedKeys = [];
const mediaStore = {
  enabled: true,
  configured: true,
  async storeFile(file, region, type, metadata) {
    const key = `${region}/${type}/${file.filename}`;
    const base = 'https://soloempleos-images.example.workers.dev';
    const presets = type === 'portadas' ? ['cover'] : ['thumb', 'full', 'admin'];
    fs.unlinkSync(file.path);
    return {
      provider: 'r2',
      key,
      urls: Object.fromEntries(presets.map(preset => [preset, `${base}/${preset}/${key}`])),
      width: metadata.width,
      height: metadata.height,
    };
  },
  publicUrl(media, type) {
    return media?.urls?.[type === 'portadas' ? 'cover' : 'full'] || '';
  },
  async deleteItem(item) {
    if (item?.media?.key) deletedKeys.push(item.media.key);
    return true;
  },
  async deleteMedia(media) {
    if (media?.key) deletedKeys.push(media.key);
    return true;
  },
};

const app = express();
app.use(express.json());
app.use('/soloempleos/gdl', require('../routes/portada')('gdl', { mediaStore }));
app.use('/soloempleos/gdl', require('../routes/vacantes')('gdl', { mediaStore }));
app.use('/soloempleos/gdl', require('../routes/cupones')('gdl', { mediaStore }));

async function upload(base, endpoint, field, buffer, token) {
  const form = new FormData();
  form.append(field, new Blob([buffer], { type: 'image/jpeg' }), 'imagen.jpg');
  return fetch(`${base}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/soloempleos/gdl`;
  const token = jwt.sign({ usuario: 'test' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const image = await sharp({
    create: { width: 900, height: 1200, channels: 3, background: '#2563eb' },
  }).jpeg().toBuffer();

  try {
    let response = await upload(base, 'vacantes', 'imagen', image, token);
    assert.equal(response.status, 200);
    const vacante = await response.json();
    assert.equal(vacante.media.provider, 'r2');
    assert.equal(vacante.media.width, 900);
    assert.equal(vacante.media.height, 1200);
    assert.equal(vacante.url, vacante.media.urls.full);

    response = await upload(base, 'portada', 'imagen', image, token);
    assert.equal(response.status, 200);
    const portada = JSON.parse(fs.readFileSync(path.join(tempDir, 'gdl', 'data', 'portada.json'), 'utf8'));
    assert.equal(portada.url, portada.media.urls.cover);

    response = await upload(base, 'cupones', 'imagen', image, token);
    assert.equal(response.status, 200);
    const cupon = await response.json();
    assert.equal(cupon.url, cupon.media.urls.full);

    const headers = { Authorization: `Bearer ${token}` };
    response = await fetch(`${base}/vacantes/${vacante.id}`, { method: 'DELETE', headers });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/cupones/${cupon.id}`, { method: 'DELETE', headers });
    assert.equal(response.status, 200);
    assert(deletedKeys.includes(vacante.media.key));
    assert(deletedKeys.includes(cupon.media.key));

    console.log('R2 routes: cargas, metadatos, URLs y eliminacion remota OK');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
