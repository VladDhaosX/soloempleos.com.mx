(function () {
  function initModal() {
    const grid = document.getElementById('vacantes-grid');
    if (!grid) return;
    const gallery = document.querySelector('.vacantes-section') || grid;
    const isCouponsPage = document.body.dataset.content === 'cupones';

    const modal = document.createElement('div');
    modal.className = 'vacante-modal';
    modal.innerHTML = `
      <button class="vacante-modal-close" aria-label="Cerrar">&times;</button>
      <img class="vacante-modal-img" alt="">
      <a class="vacante-modal-download" href="#" download aria-label="Descargar cupón" data-tooltip="Descargar cupón">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v10.2l3.6-3.6L18 11l-6 6-6-6 1.4-1.4 3.6 3.6V3zM5 19h14v2H5z"/></svg>
      </a>
      <a class="vacante-modal-whatsapp" href="#" target="_blank" rel="noopener" aria-label="Contactanos por WhatsApp" data-tooltip="Contactanos">
        <img src="/shared/img/whatsapp.svg" alt="" aria-hidden="true">
      </a>
    `;
    document.body.appendChild(modal);

    const modalImg = modal.querySelector('.vacante-modal-img');
    const modalDownload = modal.querySelector('.vacante-modal-download');
    const modalWhatsapp = modal.querySelector('.vacante-modal-whatsapp');

    function open(src, whatsappUrl, isCoupon) {
      modalImg.src = src;
      modal.classList.toggle('is-cupones', isCoupon);
      if (isCoupon) {
        const url = new URL(src, window.location.href);
        modalDownload.href = url.pathname.replace('/media/gdl/cupones/', '/gdl/uploads/cupones/');
      } else modalDownload.removeAttribute('href');
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

    gallery.addEventListener('click', (e) => {
      if (e.target.closest('.vacante-whatsapp')) return;
      const img = e.target.closest('.vacante-item img, .cupon-destacado img');
      if (!img) return;
      const item = img.closest('.vacante-item');
      const whatsapp = item ? item.querySelector('.vacante-whatsapp') : null;
      const isCoupon = isCouponsPage || Boolean(item && item.hasAttribute('data-cupon'));
      open(img.dataset.fullSrc || img.currentSrc || img.src, whatsapp ? whatsapp.href : '', isCoupon);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('vacante-modal-close')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('vacantes-grid');
    if (grid) requestAnimationFrame(() => grid.classList.add('is-ready'));
    initModal();
  });
})();
