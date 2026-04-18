(function () {
  const region = document.body.dataset.region || 'gdl';

  function adjustRegionLinks(root) {
    root.querySelectorAll('[data-region-href]').forEach(el => {
      const base = el.getAttribute('data-region-href');
      const adjusted = base.replace(/\/(gdl|mty)\//g, `/${region}/`);
      if (el.tagName === 'A') el.href = adjusted;
    });

    root.querySelectorAll('[data-region-link]').forEach(el => {
      el.classList.toggle('active', el.dataset.regionLink === region);
    });

    root.querySelectorAll('[data-region-ofertas]').forEach(el => {
      if (el.tagName === 'A') el.href = `https://soloofertas.com/${region}/`;
    });
  }

  async function loadFragment(url, placeholderId, insertedId) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      placeholder.outerHTML = await res.text();
      const inserted = document.getElementById(insertedId);
      if (inserted) adjustRegionLinks(inserted);
    } catch (_) {}
  }

  function initScrollTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      loadFragment('/shared/header.html', 'header-placeholder', 'site-header'),
      loadFragment('/shared/footer.html', 'footer-placeholder', 'site-footer'),
    ]);
    initScrollTop();
  });
})();
