const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { ADMIN_DIR, PAGES_DIR, PUBLIC_DIR, REGIONS, dataPath, uploadsPath } = require('./content-paths');
const { scheduleReferencedMediaWarmup } = require('./services/media-variants');
const { COUPONS_VISIBLE, defaultSitePublisher } = require('./services/static-site');

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

const PUBLIC_PAGE_PATHS = new Set([
  '/',
  '/gdl/inicio/',
  '/mty/inicio/',
  ...(COUPONS_VISIBLE ? ['/gdl/cupones/'] : []),
  '/gdl/guia-empleo/',
  '/mty/guia-empleo/',
  '/gdl/contacto/',
  '/mty/contacto/',
]);
const PUBLIC_PAGE_SLUGS = new Set([
  'inicio',
  'guia-empleo',
  'contacto',
  ...(COUPONS_VISIBLE ? ['cupones'] : []),
]);

function isPublicRegionPage(region, slug) {
  return PUBLIC_PAGE_SLUGS.has(slug) && (slug !== 'cupones' || region === 'gdl');
}

function cleanPathname(pathname) {
  return String(pathname || '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, match => (pathname === '/' ? match : '/'));
}

function canonicalPublicPath(pathname) {
  let cleaned = cleanPathname(pathname);
  const lowered = cleaned.toLowerCase();

  if (lowered === '/index.html') return '/';

  const regionRoot = lowered.match(/^\/(gdl|mty)\/?(?:index\.html)?$/);
  if (regionRoot) return `/${regionRoot[1]}/inicio/`;

  const nestedRegion = lowered.match(/^\/(gdl|mty)\/(gdl|mty)(?:\/([^/]+))?\/?(?:index\.html)?$/);
  if (nestedRegion && isPublicRegionPage(nestedRegion[2], nestedRegion[3] || 'inicio')) {
    return `/${nestedRegion[2]}/${nestedRegion[3] || 'inicio'}/`;
  }

  const publicPage = lowered.match(/^\/(gdl|mty)\/([^/]+)\/?(?:index\.html)?$/);
  if (publicPage && isPublicRegionPage(publicPage[1], publicPage[2])) {
    return `/${publicPage[1]}/${publicPage[2]}/`;
  }

  if (PUBLIC_PAGE_PATHS.has(lowered)) return lowered;
  return null;
}

app.use((req, res, next) => {
  if (!COUPONS_VISIBLE && /^\/gdl\/cupones(?:\/|$)/i.test(req.path)) {
    return res.redirect(302, '/gdl/inicio/');
  }

  const canonicalPath = canonicalPublicPath(req.path);
  if (req.hostname === 'www.soloempleos.com.mx') {
    return res.redirect(301, `https://soloempleos.com.mx${canonicalPath || req.originalUrl}`);
  }
  if (canonicalPath && (canonicalPath !== req.path || Object.keys(req.query).length > 0)) {
    return res.redirect(301, canonicalPath);
  }
  if (Object.prototype.hasOwnProperty.call(req.query, 'custom-css')) {
    return res.redirect(301, req.path || '/');
  }
  next();
});

function setPageAssetHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xml' || ext === '.txt') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return;
  }
  if (ext === '.css' || ext === '.js' || ext === '.svg' || ext === '.ico') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return;
  }
  if (['.jpg', '.jpeg', '.png', '.webp', '.mp4'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}

function setGeneratedPageHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  } else if (ext === '.xml') {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function setUploadHeaders(res) {
  res.setHeader('Cache-Control', 'public, max-age=604800');
}

function setDataHeaders(res) {
  res.setHeader('Cache-Control', 'no-cache');
}

app.get('/gdl', (req, res) => res.redirect(301, '/gdl/inicio/'));
app.get('/mty', (req, res) => res.redirect(301, '/mty/inicio/'));

const legacyRedirects = [
  [/^\/(?:index\.php)?$/i, '/'],
  [/^\/wp-content(?:\/.*)?$/i, '/'],
  [/^\/wp-includes(?:\/.*)?$/i, '/'],
  [/^\/wp-json(?:\/.*)?$/i, '/'],
  [/^\/comments(?:\/feed)?\/?$/i, '/'],
  [/^\/feed\/?$/i, '/'],
  [/^\/empleos-gdl(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/empleos-mty(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/gdl\/\*$/i, '/gdl/inicio/'],
  [/^\/gdl\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/home-2\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/inicio-2\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/\d{4}\/.*$/i, '/gdl/inicio/'],
  [/^\/gdl\/comments(?:\/feed)?\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/feed\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/empleospost(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/(?:consejos|entretenimiento-y-cultura|movilidad|vida-diaria)(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/gdl\/(?:consejos|entretenimiento-y-cultura|movilidad|vida-diaria|trabajos-y-derechos|mas-ediciones)(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/mas-ediciones\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/trabajos-y-derechos(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-admin(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-json(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-[^/]+\.php$/i, '/gdl/inicio/'],
  [/^\/mty\/\*$/i, '/mty/inicio/'],
  [/^\/mty\/?$/i, '/mty/inicio/'],
  [/^\/mty\/home-2\/?$/i, '/mty/inicio/'],
  [/^\/mty\/inicio-2\/?$/i, '/mty/inicio/'],
  [/^\/mty\/\d{4}\/.*$/i, '/mty/inicio/'],
  [/^\/mty\/comments(?:\/feed)?\/?$/i, '/mty/inicio/'],
  [/^\/mty\/feed\/?$/i, '/mty/inicio/'],
  [/^\/mty\/empleospost(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/(?:consejos|entretenimiento-y-cultura|movilidad|salud-y-bienestar|trabajo-y-derechos|vida-diaria)(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/mty\/(?:consejos|entretenimiento-y-cultura|movilidad|salud-y-bienestar|trabajo-y-derechos|trabajos-y-derechos|vida-diaria|mas-ediciones)(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/mas-ediciones\/?$/i, '/mty/inicio/'],
  [/^\/mty\/trabajos-y-derechos(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-admin(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-json(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-[^/]+\.php$/i, '/mty/inicio/'],
  [/^\/mty\/wp-includes(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-content(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/gdl\/wp-content(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-includes(?:\/.*)?$/i, '/gdl/inicio/'],
];

app.use((req, res, next) => {
  const match = legacyRedirects.find(([pattern]) => pattern.test(req.path));
  if (!match) return next();
  res.redirect(301, match[1]);
});

app.use('/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
}, express.static(ADMIN_DIR));
for (const region of REGIONS) {
  app.use(`/${region}/data`, express.static(path.dirname(dataPath(region, 'placeholder.json')), { setHeaders: setDataHeaders }));
  app.use(`/${region}/uploads/vacantes`, express.static(uploadsPath(region, 'vacantes'), { setHeaders: setUploadHeaders }));
  app.use(`/${region}/uploads/portadas`, express.static(uploadsPath(region, 'portadas'), { setHeaders: setUploadHeaders }));
  if (region === 'gdl') {
    app.use('/gdl/uploads/cupones', express.static(uploadsPath('gdl', 'cupones'), { setHeaders: setUploadHeaders }));
  }
}
app.use(require('./routes/media'));
app.use(express.static(PUBLIC_DIR, { setHeaders: setGeneratedPageHeaders }));
app.use(express.static(PAGES_DIR, { setHeaders: setPageAssetHeaders }));

// Routes
app.use('/soloempleos/auth', require('./routes/auth'));
app.use('/soloempleos/gdl', require('./routes/portada')('gdl'));
app.use('/soloempleos/mty', require('./routes/portada')('mty'));
app.use('/soloempleos/gdl', require('./routes/vacantes')('gdl'));
app.use('/soloempleos/mty', require('./routes/vacantes')('mty'));
app.use('/soloempleos/gdl', require('./routes/cupones')('gdl'));
app.use('/soloempleos/contacto', require('./routes/contacto'));
app.use('/soloempleos', require('./routes/backup'));

// Fallback 404 for unknown soloempleos routes
app.use('/soloempleos', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

function startServer(port = process.env.PORT || 3000, host) {
  const publicSite = defaultSitePublisher.build();
  console.log(`public site generated: ${publicSite.files.length} files`);

  const onListening = () => {
    console.log(`Solo Empleos API corriendo en puerto ${port}`);
    const mediaJob = scheduleReferencedMediaWarmup('startup');
    console.log('media prewarm scheduled:', mediaJob);
  };

  return host
    ? app.listen(port, host, onListening)
    : app.listen(port, onListening);
}

if (process.env.NODE_ENV !== 'test') startServer();

module.exports = { app, startServer };
