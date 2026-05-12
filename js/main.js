/* ── Constants ───────────────────────────────────────── */

const RATING = {
  5: { color: '#4b5e4f', label: '★★★★★ Tungsten Green' },
  4: { color: '#c9a84c', label: '★★★★☆ Warm Gold' },
  3: { color: '#7b6fa0', label: '★★★☆☆ Slate Lavender' },
  2: { color: '#c47b6a', label: '★★☆☆☆ Muted Coral' },
  1: { color: '#6a6060', label: '★☆☆☆☆ Faded Ash' },
};

const PLATFORM_COLOR = {
  'PC':     '#7fffd4',
  'PS5':    '#6699ff',
  'PS4':    '#6699ff',
  'Xbox':   '#5cb85c',
  'Switch': '#ff6b6b',
  'Mobile': '#ff85b3',
};

const STATUS_COLOR = {
  playing:  '#7fffd4',
  paused:   '#ffb085',
  dropped:  '#c47b6a',
  finished: '#ffd27f',
};

/* ── Utility: seeded height/width for books ──────────── */

function pseudoRand(str) {
  let h = 0;
  for (const c of str) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return Math.abs(h) / 2147483647;
}

function bookDims(title) {
  const r = pseudoRand(title);
  const r2 = pseudoRand(title + '!');
  return {
    h: Math.round(r * 50 + 155),   // 155–205 px
    w: Math.round(r2 * 16 + 30),   // 30–46 px
  };
}

/* ── Cursor ──────────────────────────────────────────── */

function initCursor() {
  const dot = document.getElementById('cursor');
  const TRAIL = 7;
  const trail = [];

  for (let i = 0; i < TRAIL; i++) {
    const el = document.createElement('div');
    el.className = 'cursor-trail';
    const size = Math.max(3, 10 - i * 1.2);
    el.style.cssText = `width:${size}px;height:${size}px;opacity:${(1 - i / TRAIL) * 0.35}`;
    document.body.appendChild(el);
    trail.push({ el, x: 0, y: 0 });
  }

  let mx = -100, my = -100;
  let cx = -100, cy = -100;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  document.querySelectorAll('a, button, .book, .card, .nav-link, .hero-btn')
    .forEach(el => {
      el.addEventListener('mouseenter', () => dot.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => dot.classList.remove('cursor-hover'));
    });

  function tick() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';

    let px = cx, py = cy;
    trail.forEach(t => {
      t.x += (px - t.x) * 0.28;
      t.y += (py - t.y) * 0.28;
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
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    bar.style.transform = `scaleX(${Math.min(pct, 1)})`;
  }, { passive: true });
}

/* ── Nav scroll ──────────────────────────────────────── */

function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ── Star canvas ─────────────────────────────────────── */

function initStarCanvas() {
  const canvas = document.getElementById('star-canvas');
  const ctx = canvas.getContext('2d');

  let W, H, stars, shooters;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildStars();
  }

  function buildStars() {
    stars = Array.from({ length: 220 }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      r:      Math.random() * 1.4 + 0.2,
      depth:  Math.random() * 2.5 + 0.5,
      phase:  Math.random() * Math.PI * 2,
      speed:  Math.random() * 0.6 + 0.2,
    }));
    shooters = [];
  }

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function spawnShooter() {
    shooters.push({
      x: Math.random() * W * 0.6,
      y: Math.random() * H * 0.4,
      vx: Math.random() * 3 + 2,
      vy: Math.random() * 1.5 + 0.5,
      len: Math.random() * 80 + 40,
      life: 1,
    });
  }

  setInterval(spawnShooter, 4000 + Math.random() * 5000);

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // stars
    stars.forEach(s => {
      const px = s.x + mx * s.depth * 12;
      const py = s.y + my * s.depth * 8;
      const tw = Math.sin(t * s.speed * 0.001 + s.phase) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(
        ((px % W) + W) % W,
        ((py % H) + H) % H,
        s.r, 0, Math.PI * 2
      );
      ctx.fillStyle = `rgba(184,146,255,${tw * 0.75})`;
      ctx.fill();
    });

    // shooting stars
    shooters = shooters.filter(s => s.life > 0);
    shooters.forEach(s => {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * 0.4);
      grad.addColorStop(0, `rgba(255,200,255,${s.life * 0.9})`);
      grad.addColorStop(1, 'rgba(255,200,255,0)');
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.len, s.y - s.len * 0.4);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.018;
    });

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
}

/* ── Typewriter ──────────────────────────────────────── */

function typewriter(el, text, delay = 900, speed = 55) {
  let i = 0;
  function type() {
    if (i <= text.length) {
      el.innerHTML = escapeHtml(text.slice(0, i)) + '<span class="typewriter-caret"></span>';
      i++;
      setTimeout(type, speed + Math.random() * 35);
    }
  }
  setTimeout(type, delay);
}

/* ── Render Hero ─────────────────────────────────────── */

function renderHero(about) {
  document.getElementById('hero-name').textContent = about.name;
  document.getElementById('hero-bio').textContent  = about.bio;
  typewriter(document.getElementById('hero-tagline'), about.tagline);

  document.title = `${about.name} — Dashboard`;
  document.getElementById('footer-date').textContent = new Date().getFullYear().toString();
}

/* ── Render Bookshelf ────────────────────────────────── */

function renderRatingLegend() {
  const el = document.getElementById('rating-legend');
  el.innerHTML = Object.entries(RATING).reverse().map(([, v]) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${v.color}"></span>
      <span>${v.label}</span>
    </span>
  `).join('');
}

function buildBook(book) {
  const { h, w } = bookDims(book.title);
  const isReading  = book.status === 'reading';
  const isFinished = book.status === 'finished';
  const ratingBand = isFinished && book.rating ? RATING[book.rating]?.color : null;
  const progress   = isReading ? (book.progress ?? 0) : 100;

  const el = document.createElement('div');
  el.className = `book ${book.status}`;
  el.style.cssText = `
    width: ${w}px;
    height: ${h}px;
    background: ${book.spineColor};
    --progress: ${progress}%;
  `;

  el.innerHTML = `
    ${ratingBand ? `<div class="book-band" style="background:${ratingBand}"></div>` : ''}
    <div class="book-label">
      <span class="book-label-text" style="color:${book.textColor}">${escapeHtml(book.title)}</span>
    </div>
    <div class="book-progress">
      <div class="book-progress-fill"></div>
    </div>
    <div class="book-tip">
      <span class="tip-title">${escapeHtml(book.title)}</span>
      <span class="tip-author">${escapeHtml(book.author)}</span>
      ${isReading  ? `<span class="tip-author" style="color:var(--purple);margin-top:0.3rem">${progress}% through</span>` : ''}
      ${isFinished && book.rating ? `<span class="tip-author" style="color:${ratingBand};margin-top:0.3rem">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</span>` : ''}
    </div>
  `;

  return el;
}

function initShelfHover(shelf, plank) {
  const books = Array.from(shelf.querySelectorAll('.book'));
  const glow  = plank.querySelector('.plank-glow');

  books.forEach((book, i) => {
    book.addEventListener('mouseenter', () => {
      // pop the hovered book
      book.style.transform = 'translateY(-2rem)';

      // lean neighbors
      [-2, -1, 1, 2].forEach(offset => {
        const nb = books[i + offset];
        if (!nb) return;
        const deg = offset < 0 ? -(2.5 / Math.abs(offset)) : (2.5 / Math.abs(offset));
        nb.style.transform = `rotate(${deg}deg)`;
      });

      // spine glow
      const spineColor = book.style.background;
      book.style.boxShadow = `0 0 18px ${spineColor}, 0 -8px 24px ${spineColor}40`;

      // plank spotlight
      const bookRect  = book.getBoundingClientRect();
      const shelfRect = shelf.getBoundingClientRect();
      const cx = bookRect.left - shelfRect.left + bookRect.width / 2;
      plank.classList.add('active');
      glow.style.left  = `${cx - 30}px`;
      glow.style.width = `${bookRect.width + 40}px`;
    });

    book.addEventListener('mouseleave', () => {
      book.style.transform  = '';
      book.style.boxShadow  = '';
      books.forEach(b => { if (b !== book) b.style.transform = ''; });
      plank.classList.remove('active');
    });
  });
}

function renderBooks(books) {
  const readingShelf  = document.getElementById('bookshelf-reading');
  const finishedShelf = document.getElementById('bookshelf-finished');
  const readingPlank  = document.getElementById('shelf-reading-plank');
  const finishedPlank = document.getElementById('shelf-finished-plank');

  const reading  = books.filter(b => b.status === 'reading');
  const finished = books.filter(b => b.status === 'finished');

  document.getElementById('reading-meta').textContent =
    reading.length ? `${reading.length} book${reading.length > 1 ? 's' : ''} in progress` : 'nothing on the shelf right now';

  reading.forEach(b  => readingShelf.appendChild(buildBook(b)));
  finished.forEach(b => finishedShelf.appendChild(buildBook(b)));

  initShelfHover(readingShelf, readingPlank);
  initShelfHover(finishedShelf, finishedPlank);
  renderRatingLegend();
}

/* ── Render Games ────────────────────────────────────── */

function renderGames(games) {
  const grid = document.getElementById('games-grid');
  const playing = games.filter(g => g.status === 'playing').length;

  document.getElementById('games-meta').textContent =
    playing ? `${playing} active right now` : 'on a break';

  games.forEach(game => {
    const pColor = PLATFORM_COLOR[game.platform] || '#8a7fa0';
    const sColor = STATUS_COLOR[game.status]     || '#8a7fa0';
    const isPlaying = game.status === 'playing';

    const card = document.createElement('div');
    card.className = `card game-card ${isPlaying ? 'game-playing' : ''}`;
    card.innerHTML = `
      <div class="card-glare"></div>
      <div class="game-card-top">
        <span class="game-title">${escapeHtml(game.title)}</span>
        <span class="platform-badge" style="color:${pColor};border-color:${pColor}40">${escapeHtml(game.platform)}</span>
      </div>
      <div>
        <span class="status-pill ${game.status}" style="color:${sColor};border-color:${sColor}40">
          <span class="status-dot" style="background:${sColor}"></span>
          ${game.status}
        </span>
      </div>
      <p class="game-hours"><span>${game.hours ?? 0}</span> hrs</p>
      ${game.notes ? `<p class="game-notes">${escapeHtml(game.notes)}</p>` : ''}
    `;

    grid.appendChild(card);
    initCardTilt(card);
  });
}

/* ── Render Projects ─────────────────────────────────── */

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  const active = projects.filter(p => p.status === 'active').length;

  document.getElementById('projects-meta').textContent =
    `${active} active project${active !== 1 ? 's' : ''}`;

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = `card project-card ${proj.status}`;
    card.innerHTML = `
      <div class="project-border"></div>
      <div class="card-glare"></div>
      <h3 class="project-name">${escapeHtml(proj.name)}</h3>
      <p class="project-status ${proj.status}">${proj.status.toUpperCase()}</p>
      <p class="project-desc">${escapeHtml(proj.description)}</p>
      <div class="tech-stack">
        ${proj.tech.map(t => `<span class="tech-pill">${escapeHtml(t)}</span>`).join('')}
      </div>
      ${(proj.url || proj.repo) ? `
        <div class="project-links">
          ${proj.url ? `<a class="project-link" href="${proj.url}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Live
          </a>` : ''}
          ${proj.repo ? `<a class="project-link" href="${proj.repo}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
            Repo
          </a>` : ''}
        </div>
      ` : ''}
    `;

    grid.appendChild(card);
    initCardTilt(card);
    initTechPillWave(card);
  });
}

/* ── Card 3-D tilt ───────────────────────────────────── */

function initCardTilt(card) {
  const glare = card.querySelector('.card-glare');

  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const x  = e.clientX - r.left;
    const y  = e.clientY - r.top;
    const cx = r.width  / 2;
    const cy = r.height / 2;
    const rx = ((y - cy) / cy) * -7;
    const ry = ((x - cx) / cx) *  7;

    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;

    if (glare) {
      glare.style.setProperty('--glare-x', `${(x / r.width)  * 100}%`);
      glare.style.setProperty('--glare-y', `${(y / r.height) * 100}%`);
    }
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}

/* ── Tech pill wave on hover ─────────────────────────── */

function initTechPillWave(card) {
  const pills = card.querySelectorAll('.tech-pill');
  card.addEventListener('mouseenter', () => {
    pills.forEach((p, i) => {
      p.style.transitionDelay = `${i * 40}ms`;
      p.style.transform = 'translateY(-3px)';
    });
  });
  card.addEventListener('mouseleave', () => {
    pills.forEach(p => {
      p.style.transform = '';
      p.style.transitionDelay = '0ms';
    });
  });
}

/* ── Scroll observers ────────────────────────────────── */

function initObservers() {
  // section title: glitch + underline draw
  const titleObs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('glitching');
      target.addEventListener('animationend', () => {
        target.classList.remove('glitching');
        target.classList.add('line-drawn');
      }, { once: true });
      titleObs.unobserve(target);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.section-title').forEach(el => titleObs.observe(el));

  // books drop-in
  const shelfObs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      const books = target.querySelectorAll('.book');
      books.forEach((b, i) => {
        setTimeout(() => b.classList.add('dropped'), i * 55);
      });
      shelfObs.unobserve(target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.bookshelf').forEach(el => shelfObs.observe(el));

  // cards slide-in
  const cardObs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      const cards = target.querySelectorAll('.card');
      cards.forEach((c, i) => {
        setTimeout(() => c.classList.add('visible'), i * 100);
      });
      cardObs.unobserve(target);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card-grid').forEach(el => cardObs.observe(el));
}

/* ── Helpers ─────────────────────────────────────────── */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Boot ────────────────────────────────────────────── */

async function init() {
  // Start non-data effects immediately
  initCursor();
  initScrollProgress();
  initNav();
  initStarCanvas();

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderHero(data.about);
    renderBooks(data.books    ?? []);
    renderGames(data.games    ?? []);
    renderProjects(data.projects ?? []);

    // observers need DOM to be populated first
    initObservers();
  } catch (err) {
    console.error('[dashboard] Could not load data.json:', err);
    console.info('[dashboard] Tip: open this site via a local dev server (e.g. "npx serve" or VS Code Live Server)');
  }
}

document.addEventListener('DOMContentLoaded', init);
