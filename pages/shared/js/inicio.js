(function () {
  function escapeAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function whatsappHref(telefono) {
    const digits = String(telefono || '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}` : '';
  }

  function whatsappButton(telefono) {
    const href = whatsappHref(telefono);
    if (!href) return '';
    return `
      <a class="vacante-whatsapp" href="${escapeAttr(href)}" target="_blank" rel="noopener" aria-label="Contactanos por WhatsApp" data-tooltip="Contactanos">
        <img src="/shared/img/whatsapp.svg" alt="" aria-hidden="true">
      </a>
    `;
  }

  async function cargarVacantes() {
    const region = document.body.dataset.region || 'gdl';
    const type = document.body.dataset.content || 'vacantes';
    const grid = document.getElementById('vacantes-grid');
    if (!grid) return;
    const regionName = region === 'mty' ? 'Monterrey' : 'Guadalajara';

    if (grid.dataset.ssr === type && grid.querySelector('.vacante-item')) {
      requestAnimationFrame(() => grid.classList.add('is-ready'));
      return;
    }

    try {
      const res = await fetch(`/${region}/data/${type}.json`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = `<p class="vacantes-empty">No hay ${type === 'cupones' ? 'cupones' : 'vacantes'} disponibles</p>`;
        return;
      }

      const MIN_CELLS = type === 'cupones' ? 0 : 8;
      const items = data.map(v => `
        <div class="vacante-item">
          <img
            src="/media/${region}/${type}/${escapeAttr(String(v.url || '').split('/').pop())}?w=640&q=68"
            data-full-src="/media/${region}/${type}/${escapeAttr(String(v.url || '').split('/').pop())}?w=1200&q=82"
            alt="${escapeAttr(type === 'cupones' ? `Cupón de empleo en ${regionName}` : (v.fecha ? `Vacante de empleo en ${regionName} publicada el ${v.fecha} en Solo Empleos` : `Vacante de empleo en ${regionName} en Solo Empleos`))}"
            width="3366"
            height="4134"
            loading="${type === 'cupones' ? 'eager' : 'lazy'}"
            decoding="async"
            onerror="this.onerror=null;this.src='/shared/img/placeholder.svg'"
          >
          ${type === 'vacantes' ? whatsappButton(v.telefono) : ''}
        </div>
      `).join('');
      const empty = data.length < MIN_CELLS
        ? Array(MIN_CELLS - data.length).fill('<div class="vacante-item vacante-empty"></div>').join('')
        : '';
      grid.innerHTML = items + empty;
      requestAnimationFrame(() => grid.classList.add('is-ready'));
    } catch (_) {
      grid.innerHTML = `<p class="vacantes-empty">No hay ${type === 'cupones' ? 'cupones' : 'vacantes'} disponibles</p>`;
    }
  }

  function initModal() {
    const grid = document.getElementById('vacantes-grid');
    if (!grid) return;

    const modal = document.createElement('div');
    modal.className = 'vacante-modal';
    modal.innerHTML = `
      <button class="vacante-modal-close" aria-label="Cerrar">&times;</button>
      <img class="vacante-modal-img" alt="">
      <a class="vacante-modal-whatsapp" href="#" target="_blank" rel="noopener" aria-label="Contactanos por WhatsApp" data-tooltip="Contactanos">
        <img src="/shared/img/whatsapp.svg" alt="" aria-hidden="true">
      </a>
    `;
    document.body.appendChild(modal);

    const modalImg = modal.querySelector('.vacante-modal-img');
    const modalWhatsapp = modal.querySelector('.vacante-modal-whatsapp');

    function open(src, whatsappUrl) {
      modalImg.src = src;
      if (whatsappUrl) {
        modalWhatsapp.href = whatsappUrl;
        modalWhatsapp.style.display = 'inline-flex';
      } else {
        modalWhatsapp.removeAttribute('href');
        modalWhatsapp.style.display = 'none';
      }
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      modal.classList.remove('is-open');
      modalImg.src = '';
      document.body.style.overflow = '';
    }

    grid.addEventListener('click', (e) => {
      if (e.target.closest('.vacante-whatsapp')) return;
      const img = e.target.closest('.vacante-item img');
      if (!img) return;
      const item = img.closest('.vacante-item');
      const whatsapp = item ? item.querySelector('.vacante-whatsapp') : null;
      open(img.dataset.fullSrc || img.currentSrc || img.src, whatsapp ? whatsapp.href : '');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('vacante-modal-close')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarVacantes();
    initModal();
  });
})();
