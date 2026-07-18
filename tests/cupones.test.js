const assert = require('assert');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-cupones-'));
process.env.CONTENT_DIR = tempDir;
process.env.JWT_SECRET = 'cupones-test-secret';

const app = express();
app.use(express.json());
app.use('/soloempleos/gdl', require('../routes/cupones')('gdl'));

async function run() {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/soloempleos/gdl`;
  const token = jwt.sign({ usuario: 'test' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const form = new FormData();
    form.append('imagen', new Blob([Buffer.from('fake-png')], { type: 'image/png' }), 'cupon.png');
    let res = await fetch(`${base}/cupones`, { method: 'POST', headers, body: form });
    assert.equal(res.status, 200);
    const created = await res.json();

    res = await fetch(`${base}/cupones/${created.id}/rotate`, { method: 'PUT', headers });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).rotation, 90);

    res = await fetch(`${base}/cupones/reorder`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [created.id] }),
    });
    assert.equal(res.status, 200);

    const folder = new FormData();
    folder.append('imagenes', new Blob([Buffer.from('one')], { type: 'image/png' }), '01.png');
    folder.append('imagenes', new Blob([Buffer.from('two')], { type: 'image/jpeg' }), '02.jpg');
    res = await fetch(`${base}/cupones/replace-all`, { method: 'POST', headers, body: folder });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).total, 2);

    const savedAfterReplace = JSON.parse(fs.readFileSync(path.join(tempDir, 'gdl', 'data', 'cupones.json'), 'utf8'));
    assert.equal(savedAfterReplace.length, 2);
    for (const item of savedAfterReplace) {
      res = await fetch(`${base}/cupones/${item.id}`, { method: 'DELETE', headers });
      assert.equal(res.status, 200);
    }

    const saved = JSON.parse(fs.readFileSync(path.join(tempDir, 'gdl', 'data', 'cupones.json'), 'utf8'));
    assert.deepEqual(saved, []);
    console.log('Cupones API: upload, replace-all, rotate, reorder y delete OK');
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
