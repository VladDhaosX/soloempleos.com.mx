const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const sharp = require('sharp');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-media-'));
process.env.CONTENT_DIR = tempDir;
process.env.NODE_ENV = 'test';

async function run() {
  let server;

  try {
    const uploads = path.join(tempDir, 'gdl', 'uploads', 'vacantes');
    fs.mkdirSync(uploads, { recursive: true });
    await sharp({
      create: { width: 800, height: 400, channels: 3, background: '#1957c4' },
    }).jpeg().toFile(path.join(uploads, 'sample.jpg'));
    await sharp({
      create: { width: 900, height: 500, channels: 3, background: '#0f766e' },
    }).jpeg().toFile(path.join(uploads, 'queued.jpg'));

    const mediaRouter = require('../routes/media');
    const mediaService = require('../services/media-variants');
    assert.deepEqual(Object.keys(mediaRouter.PRESETS), ['thumb', 'full', 'cover', 'admin']);
    assert.equal(sharp.concurrency(), 1);
    assert.equal(sharp.cache().files.max, 0);

    const app = express();
    app.use(mediaRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    const responses = await Promise.all([
      fetch(`${base}/media/gdl/vacantes/sample.jpg?preset=thumb`),
      fetch(`${base}/media/gdl/vacantes/sample.jpg?preset=thumb`),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/webp');
      assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      assert.equal(metadata.format, 'webp');
      assert.equal(metadata.width, 640);
      assert.equal(metadata.height, 320);
    }

    const cacheDir = path.join(uploads, '.cache');
    assert.equal(fs.readdirSync(cacheDir).filter(name => name.endsWith('.webp')).length, 1);

    const fullResponse = await fetch(`${base}/media/gdl/vacantes/sample.jpg?preset=full`);
    assert.equal(fullResponse.status, 200);
    const fullMetadata = await sharp(Buffer.from(await fullResponse.arrayBuffer())).metadata();
    assert.equal(fullMetadata.width, 800);
    assert.equal(fullMetadata.height, 400);
    assert.equal(fs.readdirSync(cacheDir).filter(name => name.endsWith('.webp')).length, 2);

    assert.equal((await fetch(`${base}/media/gdl/vacantes/sample.jpg?preset=unknown`)).status, 400);
    assert.equal((await fetch(`${base}/media/gdl/vacantes/sample.jpg?w=640&q=68`)).status, 400);
    assert.equal((await fetch(`${base}/media/gdl/vacantes/sample.jpg?preset=thumb&v=1`)).status, 400);
    assert.equal((await fetch(`${base}/media/gdl/portadas/sample.jpg?preset=thumb`)).status, 400);
    assert.equal((await fetch(`${base}/media/gdl/vacantes/missing.jpg?preset=thumb`)).status, 404);
    assert.equal((await fetch(`${base}/media/mty/cupones/sample.jpg?preset=thumb`)).status, 404);

    let releaseBlocker;
    const blocker = new Promise(resolve => { releaseBlocker = resolve; });
    const active = mediaService.__testing.enqueueTransform(() => blocker);
    const pending = Array.from(
      { length: mediaService.__testing.maxPendingTransforms },
      () => mediaService.__testing.enqueueTransform(() => Promise.resolve())
    );
    assert.deepEqual(mediaService.queueStats(), {
      active: 1,
      pending: mediaService.__testing.maxPendingTransforms,
      maxActive: mediaService.__testing.maxActiveTransforms,
      maxPending: mediaService.__testing.maxPendingTransforms,
      inFlight: 0,
    });
    const overloadedResponse = await fetch(`${base}/media/gdl/vacantes/queued.jpg?preset=thumb`);
    assert.equal(overloadedResponse.status, 503);
    assert.equal(overloadedResponse.headers.get('retry-after'), '5');
    await assert.rejects(
      mediaService.__testing.enqueueTransform(() => Promise.resolve()),
      err => err instanceof mediaService.MediaQueueFullError
    );
    releaseBlocker();
    await Promise.all([active, ...pending]);
    assert.equal(mediaService.queueStats().active, 0);
    assert.equal(mediaService.queueStats().pending, 0);

    const firstWarmup = mediaService.scheduleReferencedMediaWarmup('lock test');
    const duplicateWarmup = mediaService.scheduleReferencedMediaWarmup('lock test duplicate');
    assert.equal(firstWarmup.sharedLock, true);
    assert.equal(duplicateWarmup.skipped, 'shared-lock-active');
    await mediaService.waitForBackgroundWork();
    assert.equal(fs.existsSync(path.join(tempDir, '.media-prewarm.lock')), false);

    console.log('Media API: presets, cache y colas acotadas entre instancias OK');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
