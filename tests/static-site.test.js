const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soloempleos-static-site-'));
process.env.CONTENT_DIR = tempDir;

const { PUBLIC_DIR, dataPath } = require('../content-paths');
const { buildPublicSite, createSitePublisher, defaultSitePublisher } = require('../services/static-site');

function writeJson(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2));
}

function media(region, type, filename, presets) {
  const base = 'https://soloempleos-images.example.workers.dev';
  const key = `${region}/${type}/${filename}`;
  return {
    provider: 'r2',
    key,
    urls: Object.fromEntries(presets.map(preset => [preset, `${base}/${preset}/${key}`])),
    width: 900,
    height: 1200,
  };
}

try {
  const gdlMedia = media('gdl', 'vacantes', 'vacante.jpg', ['thumb', 'full', 'admin']);
  const gdlCover = media('gdl', 'portadas', 'portada.jpg', ['cover']);
  const mtyCover = media('mty', 'portadas', 'portada.jpg', ['cover']);

  writeJson(dataPath('gdl', 'vacantes.json'), [{
    id: 'vacante-1',
    url: gdlMedia.urls.full,
    fecha: '2026-07-31',
    telefono: '3334477077',
    media: gdlMedia,
  }]);
  writeJson(dataPath('mty', 'vacantes.json'), []);
  writeJson(dataPath('gdl', 'portada.json'), { url: gdlCover.urls.cover, media: gdlCover });
  writeJson(dataPath('mty', 'portada.json'), { url: mtyCover.urls.cover, media: mtyCover });

  const result = buildPublicSite();
  assert.equal(result.files.length, 8);

  const root = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const gdl = fs.readFileSync(path.join(PUBLIC_DIR, 'gdl', 'inicio', 'index.html'), 'utf8');
  const mty = fs.readFileSync(path.join(PUBLIC_DIR, 'mty', 'inicio', 'index.html'), 'utf8');
  const contacto = fs.readFileSync(path.join(PUBLIC_DIR, 'gdl', 'contacto', 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8');

  assert(root.includes(`${gdlCover.urls.cover}?v=2`));
  assert(root.includes(`${mtyCover.urls.cover}?v=2`));
  assert(gdl.includes(gdlMedia.urls.thumb));
  assert(gdl.includes(gdlMedia.urls.full));
  assert(gdl.includes('https://wa.me/523334477077'));
  assert(gdl.includes('width="900" height="1200"'));
  assert(!gdl.includes('employment-summary'));
  assert(!gdl.includes('href="/admin/"'));
  assert(mty.includes('No hay vacantes disponibles'));
  assert(contacto.includes('<header'));
  assert(contacto.includes('<footer'));
  assert(sitemap.includes('https://soloempleos.com.mx/gdl/inicio/'));
  assert(sitemap.includes('<lastmod>2026-07-31</lastmod>'));
  assert(!sitemap.includes('https://soloempleos.com.mx/gdl/cupones/'));
  assert(!/<loc>https:\/\/soloempleos\.com\.mx\/gdl\/guia-empleo\/<\/loc>\s*<lastmod>/.test(sitemap));

  for (const html of [root, gdl, mty, contacto]) {
    assert(!/SSR:|__SSR_PORTADA_|header-placeholder|footer-placeholder/.test(html));
    assert(!/transform:\s*rotate/.test(html));
  }

  const mtyMedia = media('mty', 'vacantes', 'nueva.jpg', ['thumb', 'full', 'admin']);
  defaultSitePublisher.writeJson(dataPath('mty', 'vacantes.json'), [{
    id: 'vacante-2',
    url: mtyMedia.urls.full,
    fecha: '2026-07-31',
    telefono: '',
    media: mtyMedia,
  }]);
  const rebuiltMty = fs.readFileSync(path.join(PUBLIC_DIR, 'mty', 'inicio', 'index.html'), 'utf8');
  assert(rebuiltMty.includes(mtyMedia.urls.thumb));

  const rollbackTarget = dataPath('gdl', 'rollback.json');
  writeJson(rollbackTarget, { version: 1 });
  let buildCalls = 0;
  const rollbackPublisher = createSitePublisher({
    build() {
      buildCalls += 1;
      if (buildCalls === 1) throw new Error('fallo simulado');
      return { files: [] };
    },
  });
  assert.throws(
    () => rollbackPublisher.writeJson(rollbackTarget, { version: 2 }),
    /fallo simulado/
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(rollbackTarget, 'utf8')), { version: 1 });
  assert.equal(buildCalls, 2);

  console.log('Static site: HTML, fragmentos, R2, sitemap, regeneracion y rollback OK');
} finally {
  if (path.resolve(tempDir).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
