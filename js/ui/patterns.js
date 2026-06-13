/**
 * Pattern library UI - renders pattern thumbnails in the sidebar.
 */
function initPatternLibrary() {
  const grid = document.getElementById('patternGrid');
  grid.innerHTML = '';

  const patterns = window.patternLibrary;

  patterns.forEach(pattern => {
    const item = document.createElement('div');
    item.className = 'pattern-item';
    item.dataset.name = pattern.name;
    if (pattern.forRule) item.dataset.forRule = pattern.forRule;

    // Render preview
    if (pattern.randomize) {
      // Special: random pattern - show a "?" preview
      const preview = document.createElement('canvas');
      preview.width = 40;
      preview.height = 40;
      const pctx = preview.getContext('2d');
      pctx.fillStyle = '#2a2a4a';
      pctx.fillRect(0, 0, 40, 40);
      pctx.fillStyle = '#9090b0';
      pctx.font = '20px system-ui';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText('🎲', 20, 20);
      item.appendChild(preview);
    } else if (pattern.pattern) {
      const preview = window.renderPatternPreview(pattern.pattern, 40);
      item.appendChild(preview);
    }

    const label = document.createElement('span');
    label.textContent = pattern.name;
    item.appendChild(label);

    grid.appendChild(item);
  });
}

window.initPatternLibrary = initPatternLibrary;
