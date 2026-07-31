const assert = require('assert');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-uploads-'));
process.env.CONTENT_DIR = tempDir;
process.env.JWT_SECRET = 'uploads-test-secret';

const app = express();
app.use(express.json());
app.use('/soloempleos/gdl', require('../routes/portada')('gdl'));
app.use('/soloempleos/gdl', require('../routes/vacantes')('gdl'));

function cacheFiles(uploadDir) {
  const cacheDir = path.join(uploadDir, '.cache');
  return fs.existsSync(cacheDir)
    ? fs.readdirSync(cacheDir).filter(name => name.endsWith('.webp'))
    : [];
}

function sourceFiles(uploadDir) {
  return fs.readdirSync(uploadDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name);
}

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/soloempleos/gdl`;
  const token = jwt.sign({ usuario: 'test' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const png = await sharp({
      create: { width: 1000, height: 1400, channels: 3, background: '#0f766e' },
    }).png().toBuffer();
    const jpeg = await sharp({
      create: { width: 1400, height: 900, channels: 3, background: '#7c3aed' },
    }).jpeg().toBuffer();

    const portadaForm = new FormData();
    portadaForm.append('imagen', new Blob([png], { type: 'image/png' }), 'portada.png');
    let res = await fetch(`${base}/portada`, { method: 'POST', headers, body: portadaForm });
    assert.equal(res.status, 200);

    const portadaDir = path.join(tempDir, 'gdl', 'uploads', 'portadas');
    assert.equal(sourceFiles(portadaDir).length, 1);
    assert.equal(path.extname(sourceFiles(portadaDir)[0]), '.png');
    assert.equal(cacheFiles(portadaDir).length, 1);

    const vacanteForm = new FormData();
    vacanteForm.append('imagen', new Blob([jpeg], { type: 'image/jpeg' }), 'vacante.jpg');
    res = await fetch(`${base}/vacantes`, { method: 'POST', headers, body: vacanteForm });
    assert.equal(res.status, 200);
    const vacante = await res.json();
    assert.equal(Object.hasOwn(vacante, 'rotation'), false);

    res = await fetch(`${base}/vacantes/${vacante.id}/rotate`, { method: 'PUT', headers });
    assert.equal(res.status, 404);

    const vacantesDir = path.join(tempDir, 'gdl', 'uploads', 'vacantes');
    assert.equal(sourceFiles(vacantesDir).length, 1);
    assert.equal(path.extname(sourceFiles(vacantesDir)[0]), '.jpg');
    assert.equal(cacheFiles(vacantesDir).length, 3);

    const invalidForm = new FormData();
    invalidForm.append('imagen', new Blob([png], { type: 'image/jpeg' }), 'mismatch.jpg');
    res = await fetch(`${base}/vacantes`, { method: 'POST', headers, body: invalidForm });
    assert.equal(res.status, 400);
    assert.equal(sourceFiles(vacantesDir).length, 1);

    console.log('Uploads: contenido validado, limites y variantes precalculadas OK');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (path.resolve(tempDir).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
