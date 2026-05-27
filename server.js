const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { ADMIN_DIR, PAGES_DIR, REGIONS, dataPath, uploadsPath } = require('./content-paths');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.hostname === 'www.soloempleos.com.mx') {
    return res.redirect(301, `https://soloempleos.com.mx${req.originalUrl}`);
  }
  next();
});

const HEADER_FRAGMENT = path.join(PAGES_DIR, 'shared', 'header.html');
const FOOTER_FRAGMENT = path.join(PAGES_DIR, 'shared', 'footer.html');

function readFragment(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; }
}

function injectFragments(html) {
  return html
    .replace('<div id="header-placeholder"></div>', readFragment(HEADER_FRAGMENT))
    .replace('<div id="footer-placeholder"></div>', readFragment(FOOTER_FRAGMENT));
}

function renderVacantes(region) {
  const file = dataPath(region, 'vacantes.json');
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return ''; }
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="vacantes-empty">No hay vacantes disponibles</p>';
  }
  const MIN_CELLS = 8;
  const esc = s => String(s).replace(/"/g, '&quot;');
  const regionName = region === 'gdl' ? 'Guadalajara' : 'Monterrey';
  const vacancyAlt = v => {
    const fecha = v.fecha ? ` publicada el ${v.fecha}` : '';
    return `Vacante en ${regionName}${fecha}`;
  };
  const waHref = telefono => {
    let digits = String(telefono || '').replace(/\D/g, '');
    if (digits.length === 10) digits = `52${digits}`;
    return digits ? `https://wa.me/${digits}` : '';
  };
  const items = data.map(v => {
    const rot = v.rotation ? ` style="transform:rotate(${Number(v.rotation)}deg)"` : '';
    const whatsappUrl = waHref(v.telefono);
    const thumbUrl = `/media/${region}/vacantes/${encodeURIComponent(path.basename(v.url))}?w=720&q=72`;
    const contact = whatsappUrl
      ? `<a class="vacante-whatsapp" href="${esc(whatsappUrl)}" target="_blank" rel="noopener" aria-label="Contactanos por WhatsApp" data-tooltip="Contactanos">` +
          `<img src="/shared/img/whatsapp.svg" alt="" aria-hidden="true">` +
        `</a>`
      : '';
    return `<div class="vacante-item">` +
      `<img src="${esc(thumbUrl)}" data-full-src="${esc(v.url)}" alt="${esc(vacancyAlt(v))}" loading="lazy" decoding="async"${rot} ` +
      `onerror="this.onerror=null;this.src='/shared/img/placeholder.svg'">` +
      contact +
    `</div>`;
  }).join('');
  const empty = data.length < MIN_CELLS
    ? '<div class="vacante-item vacante-empty"></div>'.repeat(MIN_CELLS - data.length)
    : '';
  return items + empty;
}

function injectVacantes(html, region) {
  if (!region) return html;
  return html.replace('<!-- SSR:VACANTES -->', renderVacantes(region));
}

function renderPortadaUrl(region) {
  const file = dataPath(region, 'portada.json');
  try {
    const { url, version } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!url) return '/shared/img/placeholder.svg';
    const filename = encodeURIComponent(path.basename(url));
    return `/media/${region}/portadas/${filename}?w=720&q=76&v=${version || Date.now()}`;
  } catch (_) {
    return '/shared/img/placeholder.svg';
  }
}

function injectPortadas(html) {
  if (!html.includes('__SSR_PORTADA_')) return html;
  return html
    .replace('__SSR_PORTADA_GDL__', renderPortadaUrl('gdl'))
    .replace('__SSR_PORTADA_MTY__', renderPortadaUrl('mty'));
}

app.use((req, res, next) => {
  let urlPath = decodeURIComponent(req.path);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  if (!urlPath.endsWith('.html')) return next();

  const filePath = path.join(PAGES_DIR, urlPath);
  if (!filePath.startsWith(PAGES_DIR)) return next();

  const regionMatch = urlPath.match(/^\/(gdl|mty)\//);
  const region = regionMatch ? regionMatch[1] : null;

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) return next();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(injectPortadas(injectVacantes(injectFragments(html), region)));
  });
});

app.get('/gdl', (req, res) => res.redirect(301, '/gdl/inicio/'));
app.get('/mty', (req, res) => res.redirect(301, '/mty/inicio/'));

const legacyRedirects = [
  [/^\/(?:index\.php)?$/i, '/'],
  [/^\/wp-content(?:\/.*)?$/i, '/'],
  [/^\/wp-includes(?:\/.*)?$/i, '/'],
  [/^\/empleos-gdl(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/empleos-mty(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/gdl\/\*$/i, '/gdl/inicio/'],
  [/^\/gdl\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/home-2\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/inicio-2\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/\d{4}\/.*$/i, '/gdl/inicio/'],
  [/^\/gdl\/empleospost(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/(?:consejos|entretenimiento-y-cultura|movilidad|vida-diaria)(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/mas-ediciones\/?$/i, '/gdl/inicio/'],
  [/^\/gdl\/trabajos-y-derechos(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-admin(?:\/.*)?$/i, '/gdl/inicio/'],
  [/^\/gdl\/wp-[^/]+\.php$/i, '/gdl/inicio/'],
  [/^\/mty\/\*$/i, '/mty/inicio/'],
  [/^\/mty\/?$/i, '/mty/inicio/'],
  [/^\/mty\/home-2\/?$/i, '/mty/inicio/'],
  [/^\/mty\/inicio-2\/?$/i, '/mty/inicio/'],
  [/^\/mty\/\d{4}\/.*$/i, '/mty/inicio/'],
  [/^\/mty\/empleospost(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/(?:consejos|entretenimiento-y-cultura|movilidad|salud-y-bienestar|trabajo-y-derechos|vida-diaria)(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/mas-ediciones\/?$/i, '/mty/inicio/'],
  [/^\/mty\/trabajos-y-derechos(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-admin(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/mty\/wp-[^/]+\.php$/i, '/mty/inicio/'],
  [/^\/mty\/wp-content(?:\/.*)?$/i, '/mty/inicio/'],
  [/^\/gdl\/wp-content(?:\/.*)?$/i, '/gdl/inicio/'],
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
  app.use(`/${region}/data`, express.static(path.dirname(dataPath(region, 'placeholder.json'))));
  app.use(`/${region}/uploads/vacantes`, express.static(uploadsPath(region, 'vacantes')));
  app.use(`/${region}/uploads/portadas`, express.static(uploadsPath(region, 'portadas')));
}
app.use(require('./routes/media'));
app.use(express.static(PAGES_DIR));

// Routes
app.use('/soloempleos/auth', require('./routes/auth'));
app.use('/soloempleos/gdl', require('./routes/portada')('gdl'));
app.use('/soloempleos/mty', require('./routes/portada')('mty'));
app.use('/soloempleos/gdl', require('./routes/vacantes')('gdl'));
app.use('/soloempleos/mty', require('./routes/vacantes')('mty'));
app.use('/soloempleos/contacto', require('./routes/contacto'));
app.use('/soloempleos', require('./routes/backup'));

// Fallback 404 for unknown soloempleos routes
app.use('/soloempleos', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solo Empleos API corriendo en puerto ${PORT}`);
});
