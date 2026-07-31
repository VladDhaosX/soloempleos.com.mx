const fs = require('fs');
const path = require('path');
const {
  PAGES_DIR,
  PUBLIC_DIR,
  dataPath,
  uploadsPath,
} = require('../content-paths');

const COUPONS_VISIBLE = false;
const COVER_TRANSFORM_VERSION = 2; // ponytail: bump only when the immutable cover transform changes.
const HEADER_FRAGMENT = path.join(PAGES_DIR, 'shared', 'header.html');
const FOOTER_FRAGMENT = path.join(PAGES_DIR, 'shared', 'footer.html');
const PUBLIC_TEMPLATES = Object.freeze([
  'index.html',
  'gdl/inicio/index.html',
  'mty/inicio/index.html',
  'gdl/guia-empleo/index.html',
  'mty/guia-empleo/index.html',
  'gdl/contacto/index.html',
  'mty/contacto/index.html',
  ...(COUPONS_VISIBLE ? ['gdl/cupones/index.html'] : []),
]);

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return fallback;
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value) {
  return escapeHtmlAttribute(value).replace(/'/g, '&apos;');
}

function readImageDimensions(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(stat.size, 64 * 1024));
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    const data = buffer.subarray(0, bytesRead);

    if (data.length >= 24 && data.toString('ascii', 1, 4) === 'PNG') {
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    }

    if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) break;
        const marker = data[offset + 1];
        const length = data.readUInt16BE(offset + 2);
        if (length < 2) break;
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return {
            width: data.readUInt16BE(offset + 7),
            height: data.readUInt16BE(offset + 5),
          };
        }
        offset += 2 + length;
      }
    }
  } catch (_) {}
  return null;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function storedMediaUrl(item, region, type, preset) {
  const remotePreset = safeHttpsUrl(item?.media?.urls?.[preset]);
  if (remotePreset) return remotePreset;

  const remoteFallback = safeHttpsUrl(item?.url);
  if (remoteFallback) return remoteFallback;

  const filename = path.basename(String(item?.url || ''));
  return filename
    ? `/media/${region}/${type}/${encodeURIComponent(filename)}?preset=${encodeURIComponent(preset)}`
    : '/shared/img/placeholder.svg';
}

function imageDimensionAttrs(item, filePath) {
  const width = Number(item?.media?.width);
  const height = Number(item?.media?.height);
  const dimensions = Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0
    ? { width, height }
    : readImageDimensions(filePath);
  return dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
}

function adjustFragmentForRegion(fragment, region) {
  if (!region) return fragment;
  if (region !== 'gdl') {
    fragment = fragment.replace(/<a\b[^>]*data-gdl-only[^>]*>[\s\S]*?<\/a>/g, '');
  }

  return fragment
    .replace(/<a\b[^>]*>/g, tag => {
      let updated = tag;
      const regionHref = updated.match(/data-region-href="([^"]*)"/);
      if (regionHref) {
        const adjusted = regionHref[1].replace(/\/(gdl|mty)\//g, `/${region}/`);
        updated = updated.includes(' href=')
          ? updated.replace(/href="[^"]*"/, `href="${adjusted}"`)
          : updated.replace('<a ', `<a href="${adjusted}" `);
      }

      if (updated.includes('data-region-ofertas=')) {
        updated = updated.replace(/href="[^"]*"/, `href="https://soloofertas.com/${region}/"`);
        updated = updated.replace(/data-region-ofertas="(?:gdl|mty)"/, `data-region-ofertas="${region}"`);
      }

      const regionLink = updated.match(/data-region-link="([^"]*)"/);
      if (regionLink) {
        updated = updated.replace(/\sclass="active"/, '');
        if (regionLink[1] === region) {
          updated = updated.includes(' class=')
            ? updated.replace(/class="([^"]*)"/, (_, classes) => `class="${classes} active"`)
            : updated.replace('<a ', '<a class="active" ');
        }
      }
      return updated;
    })
    .replace(/src="\/shared\/img\/logo-(?:gdl|mty)\.jpg"/g, `src="/shared/img/logo-${region}.jpg"`);
}

function injectFragments(html, region) {
  const header = adjustFragmentForRegion(readText(HEADER_FRAGMENT), region);
  const footer = adjustFragmentForRegion(readText(FOOTER_FRAGMENT), region);
  return html
    .replace('<div id="header-placeholder"></div>', header)
    .replace('<div id="footer-placeholder"></div>', footer);
}

function renderVacantes(region) {
  const data = readJson(dataPath(region, 'vacantes.json'), []);
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="vacantes-empty">No hay vacantes disponibles</p>';
  }

  const regionName = region === 'gdl' ? 'Guadalajara' : 'Monterrey';
  const items = data.map(item => {
    const digits = String(item.telefono || '').replace(/\D/g, '');
    const whatsappUrl = digits ? `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}` : '';
    const fecha = item.fecha ? ` publicada el ${item.fecha}` : '';
    const alt = `Vacante de empleo en ${regionName}${fecha} en Solo Empleos`;
    const sourcePath = uploadsPath(region, 'vacantes', path.basename(String(item.url || '')));
    const thumbUrl = storedMediaUrl(item, region, 'vacantes', 'thumb');
    const fullUrl = storedMediaUrl(item, region, 'vacantes', 'full');
    const contact = whatsappUrl
      ? `<a class="vacante-whatsapp" href="${escapeHtmlAttribute(whatsappUrl)}" target="_blank" rel="noopener" aria-label="Contactanos por WhatsApp" data-tooltip="Contactanos"><img src="/shared/img/whatsapp.svg" alt="" aria-hidden="true"></a>`
      : '';
    return `<div class="vacante-item"><img src="${escapeHtmlAttribute(thumbUrl)}" data-full-src="${escapeHtmlAttribute(fullUrl)}" alt="${escapeHtmlAttribute(alt)}"${imageDimensionAttrs(item, sourcePath)} loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/shared/img/placeholder.svg'">${contact}</div>`;
  }).join('');

  const empty = data.length < 8
    ? '<div class="vacante-item vacante-empty"></div>'.repeat(8 - data.length)
    : '';
  return items + empty;
}

function renderCupones() {
  if (!COUPONS_VISIBLE) return '';
  const data = readJson(dataPath('gdl', 'cupones.json'), []);
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="vacantes-empty">No hay cupones disponibles</p>';
  }

  return data.map(item => {
    const sourcePath = uploadsPath('gdl', 'cupones', path.basename(String(item.url || '')));
    const thumbUrl = storedMediaUrl(item, 'gdl', 'cupones', 'thumb');
    const fullUrl = storedMediaUrl(item, 'gdl', 'cupones', 'full');
    return `<div class="vacante-item" data-cupon><img src="${escapeHtmlAttribute(thumbUrl)}" data-full-src="${escapeHtmlAttribute(fullUrl)}" alt="Cupon de empleo en Guadalajara"${imageDimensionAttrs(item, sourcePath)} loading="eager" decoding="async" onerror="this.onerror=null;this.src='/shared/img/placeholder.svg'"></div>`;
  }).join('');
}

function renderPortada(region) {
  const portada = readJson(dataPath(region, 'portada.json'), {});
  if (!portada.url) return { url: '/shared/img/placeholder.svg', width: 400, height: 300 };

  const sourcePath = uploadsPath(region, 'portadas', path.basename(String(portada.url)));
  const storedWidth = Number(portada.media?.width);
  const storedHeight = Number(portada.media?.height);
  const dimensions = Number.isInteger(storedWidth) && storedWidth > 0 &&
    Number.isInteger(storedHeight) && storedHeight > 0
    ? { width: storedWidth, height: storedHeight }
    : readImageDimensions(sourcePath);
  const coverUrl = storedMediaUrl(portada, region, 'portadas', 'cover');
  return {
    url: portada.media?.provider === 'r2' ? `${coverUrl}?v=${COVER_TRANSFORM_VERSION}` : coverUrl,
    width: dimensions?.width || 720,
    height: dimensions?.height || 900,
  };
}

function renderTemplate(relativePath) {
  const sourcePath = path.join(PAGES_DIR, relativePath);
  const regionMatch = relativePath.replace(/\\/g, '/').match(/^(gdl|mty)\//);
  const region = regionMatch ? regionMatch[1] : null;
  let html = readText(sourcePath);
  if (!html) throw new Error(`Plantilla publica no encontrada: ${relativePath}`);

  html = injectFragments(html, region);
  if (region) html = html.replace('<!-- SSR:VACANTES -->', renderVacantes(region));
  html = html.replace('<!-- SSR:CUPONES -->', renderCupones());

  if (html.includes('__SSR_PORTADA_')) {
    const gdl = renderPortada('gdl');
    const mty = renderPortada('mty');
    html = html
      .replace('__SSR_PORTADA_GDL__', gdl.url)
      .replace('__SSR_PORTADA_GDL_WIDTH__', String(gdl.width))
      .replace('__SSR_PORTADA_GDL_HEIGHT__', String(gdl.height))
      .replace('__SSR_PORTADA_MTY__', mty.url)
      .replace('__SSR_PORTADA_MTY_WIDTH__', String(mty.width))
      .replace('__SSR_PORTADA_MTY_HEIGHT__', String(mty.height));
  }

  if (/SSR:|__SSR_PORTADA_|header-placeholder|footer-placeholder/.test(html)) {
    throw new Error(`La pagina publica conserva marcadores dinamicos: ${relativePath}`);
  }
  return html;
}

function newestDate(paths) {
  const times = paths.map(filePath => {
    try {
      return fs.statSync(filePath).mtimeMs;
    } catch (_) {
      return 0;
    }
  }).filter(Boolean);
  return new Date(times.length ? Math.max(...times) : Date.now()).toISOString().slice(0, 10);
}

function sitemapEntry(url, priority, paths) {
  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${newestDate(paths)}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
}

function renderSitemapXml() {
  const entries = [
    sitemapEntry('https://soloempleos.com.mx/', '1.0', [path.join(PAGES_DIR, 'index.html')]),
    sitemapEntry('https://soloempleos.com.mx/gdl/inicio/', '0.9', [
      path.join(PAGES_DIR, 'gdl', 'inicio', 'index.html'),
      dataPath('gdl', 'vacantes.json'),
      dataPath('gdl', 'portada.json'),
    ]),
    sitemapEntry('https://soloempleos.com.mx/mty/inicio/', '0.9', [
      path.join(PAGES_DIR, 'mty', 'inicio', 'index.html'),
      dataPath('mty', 'vacantes.json'),
      dataPath('mty', 'portada.json'),
    ]),
    sitemapEntry('https://soloempleos.com.mx/gdl/guia-empleo/', '0.7', [path.join(PAGES_DIR, 'gdl', 'guia-empleo', 'index.html')]),
    sitemapEntry('https://soloempleos.com.mx/mty/guia-empleo/', '0.7', [path.join(PAGES_DIR, 'mty', 'guia-empleo', 'index.html')]),
    sitemapEntry('https://soloempleos.com.mx/gdl/contacto/', '0.6', [path.join(PAGES_DIR, 'gdl', 'contacto', 'index.html')]),
    sitemapEntry('https://soloempleos.com.mx/mty/contacto/', '0.6', [path.join(PAGES_DIR, 'mty', 'contacto', 'index.html')]),
  ];
  if (COUPONS_VISIBLE) {
    entries.splice(3, 0, sitemapEntry('https://soloempleos.com.mx/gdl/cupones/', '0.8', [
      path.join(PAGES_DIR, 'gdl', 'cupones', 'index.html'),
      dataPath('gdl', 'cupones.json'),
    ]));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

function writeFileAtomic(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  fs.writeFileSync(temp, content);
  try {
    fs.renameSync(temp, target);
  } catch (err) {
    if (!['EEXIST', 'EPERM'].includes(err.code)) {
      fs.rmSync(temp, { force: true });
      throw err;
    }
    fs.rmSync(target, { force: true });
    fs.renameSync(temp, target);
  }
}

function buildPublicSite() {
  const generated = [];
  for (const relativePath of PUBLIC_TEMPLATES) {
    writeFileAtomic(path.join(PUBLIC_DIR, relativePath), renderTemplate(relativePath));
    generated.push(relativePath);
  }
  writeFileAtomic(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemapXml());
  generated.push('sitemap.xml');

  if (!COUPONS_VISIBLE) {
    fs.rmSync(path.join(PUBLIC_DIR, 'gdl', 'cupones'), { recursive: true, force: true });
  }
  return { directory: PUBLIC_DIR, files: generated };
}

function createSitePublisher({ build = buildPublicSite } = {}) {
  return {
    build,
    writeJson(target, value) {
      const existed = fs.existsSync(target);
      const previous = existed ? fs.readFileSync(target) : null;
      writeFileAtomic(target, `${JSON.stringify(value, null, 2)}\n`);
      try {
        return build();
      } catch (err) {
        if (existed) writeFileAtomic(target, previous);
        else fs.rmSync(target, { force: true });
        try {
          build();
        } catch (rollbackError) {
          console.error('static site rollback build error:', rollbackError);
        }
        throw err;
      }
    },
  };
}

const defaultSitePublisher = createSitePublisher();

module.exports = {
  COUPONS_VISIBLE,
  PUBLIC_TEMPLATES,
  buildPublicSite,
  createSitePublisher,
  defaultSitePublisher,
  renderSitemapXml,
  renderTemplate,
};
