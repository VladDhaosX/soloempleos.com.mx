import assert from 'node:assert/strict';
import worker, { parseRequestPath } from '../cloudflare/image-worker/src/index.mjs';

const originalFetch = globalThis.fetch;
const calls = [];

try {
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Set-Cookie': 'no=guardar' },
    });
  };

  assert.deepEqual(
    parseRequestPath('/thumb/gdl/vacantes/imagen-123.jpg'),
    { preset: 'thumb', region: 'gdl', type: 'vacantes', filename: 'imagen-123.jpg' }
  );
  assert.equal(parseRequestPath('/cover/gdl/vacantes/imagen.jpg'), null);
  assert.equal(parseRequestPath('/thumb/gdl/vacantes/../secreto.jpg'), null);

  const response = await worker.fetch(
    new Request('https://soloempleos-images.example.workers.dev/thumb/gdl/vacantes/imagen-123.jpg'),
    { R2_PUBLIC_BASE_URL: 'https://pub-ejemplo.r2.dev/' }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://pub-ejemplo.r2.dev/gdl/vacantes/imagen-123.jpg');
  assert.deepEqual(calls[0].options.cf.image, {
    width: 640,
    height: 1600,
    fit: 'scale-down',
    quality: 68,
    format: 'auto',
  });

  const invalid = await worker.fetch(
    new Request('https://soloempleos-images.example.workers.dev/ancho-999/gdl/vacantes/imagen.jpg'),
    { R2_PUBLIC_BASE_URL: 'https://pub-ejemplo.r2.dev' }
  );
  assert.equal(invalid.status, 404);
  assert.equal(calls.length, 1);

  const method = await worker.fetch(
    new Request('https://soloempleos-images.example.workers.dev/thumb/gdl/vacantes/imagen.jpg', { method: 'POST' }),
    { R2_PUBLIC_BASE_URL: 'https://pub-ejemplo.r2.dev' }
  );
  assert.equal(method.status, 405);

  console.log('Cloudflare Worker: presets fijos, origen R2 y validacion de rutas OK');
} finally {
  globalThis.fetch = originalFetch;
}
