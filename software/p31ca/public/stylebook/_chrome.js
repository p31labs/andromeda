

      <header class="sb-topbar">
        <button class="sb-topbar-btn" id="sb-menu-toggle" style="display: none;" aria-label="Toggle menu">☰</button>




    <div class="sb-search-overlay" id="sb-search-overlay" style="display: none;"></div>
  `;


  const prev = flat[idx - 1];
  const next = flat[idx + 1];

  if (!prev && !next) return '';




  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;



    let html = code.innerHTML;

    // Already escaped, work with HTML
    const lang = code.parentElement.parentElement.dataset.lang || 'plain';



