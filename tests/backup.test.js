const assert = require('assert');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');
const unzipper = require('unzipper');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-backup-'));
process.env.CONTENT_DIR = tempDir;
process.env.JWT_SECRET = 'backup-test-secret';

const dataDir = path.join(tempDir, 'gdl', 'data');
const uploadDir = path.join(tempDir, 'gdl', 'uploads', 'vacantes');
const cacheDir = path.join(uploadDir, '.cache');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'vacantes.json'), '[]');
fs.writeFileSync(path.join(uploadDir, 'sample.jpg'), 'backup-source');
fs.writeFileSync(path.join(cacheDir, 'ignored.webp'), 'cache');

const app = express();
app.use('/soloempleos', require('../routes/backup'));

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/soloempleos`;
  const token = jwt.sign({ usuario: 'test' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };

  try {
    let res = await fetch(`${base}/backup`, { headers });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/zip');
    const zip = Buffer.from(await res.arrayBuffer());
    const directory = await unzipper.Open.buffer(zip);
    const names = directory.files.map(file => file.path.replace(/\\/g, '/'));
    assert(names.includes('gdl/data/vacantes.json'));
    assert(names.includes('gdl/uploads/vacantes/sample.jpg'));
    assert(!names.some(name => name.split('/').includes('.cache')));

    const form = new FormData();
    form.append('backup', new Blob([zip], { type: 'application/zip' }), 'backup.zip');
    res = await fetch(`${base}/backup/restore`, { method: 'POST', headers, body: form });
    assert.equal(res.status, 200);
    const restored = await res.json();
    assert.equal(restored.ok, true);
    assert(restored.mediaJob.id > 0);
    await require('../services/media-variants').waitForBackgroundWork();
    assert(!fs.existsSync(cacheDir));

    console.log('Backup: archiver ESM, exclusion de cache y restauracion OK');
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
