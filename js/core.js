/* ── Cursor ──────────────────────────────────────────── */
function initCursor() {
  const dot = document.getElementById('cursor');
  const TRAIL = 6;
  const trail = [];

  for (let i = 0; i < TRAIL; i++) {
    const el = document.createElement('div');
    el.className = 'cursor-trail';
    const size = Math.max(2, 9 - i * 1.3);
    el.style.cssText = `width:${size}px;height:${size}px;opacity:${(1 - i / TRAIL) * 0.3}`;
    document.body.appendChild(el);
    trail.push({ el, x: -100, y: -100 });
  }

  let mx = -200, my = -200, cx = -200, cy = -200;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function markHoverable() {
    document.querySelectorAll('a, button, .book, .card, .status-card').forEach(el => {
      el.addEventListener('mouseenter', () => dot.classList.add('hover'));
      el.addEventListener('mouseleave', () => dot.classList.remove('hover'));
    });
  }
  markHoverable();

  // re-run after dynamic content is added
  window.addEventListener('content-ready', markHoverable);

  function tick() {
    cx += (mx - cx) * 0.16;
    cy += (my - cy) * 0.16;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';

    let px = cx, py = cy;
    trail.forEach(t => {
      t.x += (px - t.x) * 0.26;
      t.y += (py - t.y) * 0.26;
      t.el.style.left = t.x + 'px';
      t.el.style.top  = t.y + 'px';
      px = t.x; py = t.y;
    });

    requestAnimationFrame(tick);
  }
  tick();
}

/* ── Scroll progress ─────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  }, { passive: true });
}

/* ── Nav scroll state + active link ─────────────────── */
function initNav() {
  const nav  = document.getElementById('nav');
  const page = document.body.dataset.page;

  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    if (link.dataset.page === page) link.classList.add('active');
  });

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initScrollProgress();
  initNav();
});
