(function () {
  async function cargarVacantes() {
    const region = document.body.dataset.region || 'gdl';
    const grid = document.getElementById('vacantes-grid');
    if (!grid) return;

    if (grid.dataset.ssr === 'vacantes' && grid.querySelector('.vacante-item')) {
      requestAnimationFrame(() => grid.classList.add('is-ready'));
      return;
    }

    try {
      const res = await fetch(`/${region}/data/vacantes.json`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = '<p class="vacantes-empty">No hay vacantes disponibles</p>';
        return;
      }

      const MIN_CELLS = 8;
      const items = data.map(v => `
        <div class="vacante-item">
          <img
            src="${v.url}"
            alt="Vacante"
            loading="lazy"
            onerror="this.onerror=null;this.src='/shared/img/placeholder.svg'"
          >
        </div>
      `).join('');
      const empty = data.length < MIN_CELLS
        ? Array(MIN_CELLS - data.length).fill('<div class="vacante-item vacante-empty"></div>').join('')
        : '';
      grid.innerHTML = items + empty;
      requestAnimationFrame(() => grid.classList.add('is-ready'));
    } catch (_) {
      grid.innerHTML = '<p class="vacantes-empty">No hay vacantes disponibles</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', cargarVacantes);
})();
