const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-public-server-'));
process.env.CONTENT_DIR = tempDir;
process.env.JWT_SECRET = 'public-server-test-secret';
process.env.NODE_ENV = 'test';

const { dataPath } = require('../content-paths');

function writeJson(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2));
}

const workerBase = 'https://soloempleos-images.example.workers.dev';
const key = 'gdl/vacantes/publicada.jpg';
writeJson(dataPath('gdl', 'vacantes.json'), [{
  id: 'publicada-1',
  url: `${workerBase}/full/${key}`,
  fecha: '2026-07-31',
  telefono: '3334477077',
  media: {
    provider: 'r2',
    key,
    urls: {
      thumb: `${workerBase}/thumb/${key}`,
      full: `${workerBase}/full/${key}`,
    },
    width: 900,
    height: 1200,
  },
}]);

const { startServer } = require('../server');

async function run() {
  const server = startServer(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    let res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert((await res.text()).includes('Vacantes en Guadalajara y Monterrey'));

    res = await fetch(`${base}/index.html`, { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/');

    res = await fetch(`${base}/gdl/inicio/`);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('cache-control'),
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    );
    const html = await res.text();
    assert(html.includes(`${workerBase}/thumb/${key}`));
    assert(!html.includes('employment-summary'));
    assert(!html.includes('href="/admin/"'));
    assert(!/SSR:|header-placeholder|footer-placeholder/.test(html));

    res = await fetch(`${base}/sitemap.xml`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /xml/);
    const sitemap = await res.text();
    assert(sitemap.includes('https://soloempleos.com.mx/gdl/inicio/'));
    assert(sitemap.includes('<lastmod>2026-07-31</lastmod>'));
    assert(!sitemap.includes('https://soloempleos.com.mx/gdl/cupones/'));

    res = await fetch(`${base}/robots.txt`);
    assert.equal(res.status, 200);
    const robots = await res.text();
    assert(robots.includes('Allow: /'));
    assert(!robots.includes('Disallow: /admin/'));

    res = await fetch(`${base}/admin/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert((await res.text()).includes('<meta name="robots" content="noindex, nofollow">'));

    res = await fetch(`${base}/admin/js/admin.js`);
    assert.equal(res.status, 200);
    const adminJs = await res.text();
    assert(adminJs.includes('const COVER_TRANSFORM_VERSION = 2'));
    assert(adminJs.includes("parsed.searchParams.set('v', COVER_TRANSFORM_VERSION)"));

    res = await fetch(`${base}/gdl`, { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/gdl/inicio/');

    res = await fetch(`${base}/gdl/cupones/`, { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/gdl/inicio/');

    res = await fetch(`${base}/gdl/home-2/`, { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/gdl/inicio/');

    for (const legacyPath of [
      '/gdl/2025/08/29/articulo-retirado/',
      '/mty/wp-content/plugins/essential-blocks/plugin.php',
      '/gdl/wp-admin/admin-ajax.php',
      '/wp-login.php',
      '/xmlrpc.php',
    ]) {
      res = await fetch(`${base}${legacyPath}`, { redirect: 'manual' });
      assert.equal(res.status, 410);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    }

    res = await fetch(`${base}/?custom-css=c3034b02eb`, { redirect: 'manual' });
    assert.equal(res.status, 410);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');

    console.log('Public server: HTML estatico, cache, sitemap y redirecciones OK');
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
