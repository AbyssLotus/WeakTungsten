/* ── Constants ───────────────────────────────────────── */
const RATING = {
  5: { color: '#4b5e4f', label: '5 / 5 — Tungsten Green' },
  4: { color: '#c9a84c', label: '4 / 5 — Warm Gold' },
  3: { color: '#6b7a6b', label: '3 / 5 — Slate' },
  2: { color: '#c07060', label: '2 / 5 — Rust' },
  1: { color: '#6a5a50', label: '1 / 5 — Ash' },
};

const PLATFORM_COLOR = {
  'PC':     '#7eb89a',
  'PS5':    '#6688cc',
  'PS4':    '#6688cc',
  'Xbox':   '#6aaa60',
  'Switch': '#cc6666',
  'Mobile': '#c09060',
};

const STATUS_COLOR = {
  playing:  '#7eb89a',
  paused:   '#b09060',
  dropped:  '#c07060',
  finished: '#9ab060',
};

/* ── Helpers ─────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pseudoRand(str) {
  let h = 0;
  for (const c of str) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return Math.abs(h) / 2147483647;
}

function bookDims(title) {
  const r  = pseudoRand(title);
  const r2 = pseudoRand(title + '§');
  return { h: Math.round(r * 50 + 158), w: Math.round(r2 * 16 + 30) };
}

/* ── Card tilt ───────────────────────────────────────── */
function initTilt(card) {
  const glare = card.querySelector('.card-glare');
  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const x  = e.clientX - r.left;
    const y  = e.clientY - r.top;
    const rx = ((y - r.height / 2) / (r.height / 2)) * -6;
    const ry = ((x - r.width  / 2) / (r.width  / 2)) *  6;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(3px)`;
    if (glare) {
      glare.style.setProperty('--gx', `${(x / r.width)  * 100}%`);
      glare.style.setProperty('--gy', `${(y / r.height) * 100}%`);
    }
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
}

/* ── Tech pill wave ──────────────────────────────────── */
function initPillWave(card) {
  const pills = card.querySelectorAll('.tech-pill');
  card.addEventListener('mouseenter', () => {
    pills.forEach((p, i) => {
      p.style.transitionDelay = `${i * 35}ms`;
      p.style.transform = 'translateY(-3px)';
    });
  });
  card.addEventListener('mouseleave', () => {
    pills.forEach(p => { p.style.transform = ''; p.style.transitionDelay = '0ms'; });
  });
}

/* ── Open-book panel (singleton) ────────────────────── */
let bopCloseTimer = null;

function initBookPanel() {
  const backdrop = document.createElement('div');
  backdrop.id = 'book-backdrop';
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.id = 'book-open-panel';
  panel.style.position = 'fixed';
  panel.innerHTML = `
    <button class="bop-close" id="bop-close">✕</button>
    <div class="bop-cover" id="bop-cover">
      <div class="bop-pages">
        <div class="bop-left"  id="bop-left"></div>
        <div class="bop-binding"></div>
        <div class="bop-right" id="bop-right"></div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  function close() {
    panel.classList.remove('visible');
    backdrop.classList.remove('visible');
  }

  backdrop.addEventListener('click', close);
  document.getElementById('bop-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // keep panel open while mouse is over it
  panel.addEventListener('mouseenter', () => clearTimeout(bopCloseTimer));
  panel.addEventListener('mouseleave', () => {
    bopCloseTimer = setTimeout(close, 220);
  });
}

function openBookPanel(book) {
  clearTimeout(bopCloseTimer);

  const panel   = document.getElementById('book-open-panel');
  const cover   = document.getElementById('bop-cover');
  const left    = document.getElementById('bop-left');
  const right   = document.getElementById('bop-right');
  const backdrop = document.getElementById('book-backdrop');

  const color    = book.spineColor || '#3a2060';
  const progress = book.status === 'reading' ? (book.progress ?? 0) : 100;
  const rInfo    = book.rating ? RATING[book.rating] : null;

  // update CSS custom property for cover color
  cover.style.setProperty('--bop-color', color);
  document.getElementById('bop-cover').style.borderColor = color;
  document.querySelectorAll('.bop-binding::before, .bop-binding::after')
    .forEach(el => el.style.background = color);

  // stars HTML
  const stars = book.rating
    ? `<span class="bop-stars">${'★'.repeat(book.rating)}<span class="empty">${'★'.repeat(5 - book.rating)}</span></span>`
    : book.status === 'reading'
      ? `<span class="bop-stars" style="color:#8a7860;font-size:0.7rem;letter-spacing:0.1em">IN PROGRESS</span>`
      : '';

  // LEFT page
  left.innerHTML = `
    ${book.genre ? `<p class="bop-genre">${esc(book.genre)}</p>` : ''}
    <h2 class="bop-title">${esc(book.title)}</h2>
    <p class="bop-author">by ${esc(book.author)}</p>
    ${stars}
    ${book.notes
      ? `<p class="bop-note">${esc(book.notes)}</p>`
      : `<p class="bop-no-note">No notes yet.</p>`}
  `;

  // RIGHT page
  const statusLabel = book.status.charAt(0).toUpperCase() + book.status.slice(1);
  const statusColor = book.status === 'reading' ? '#cc2820'
    : book.status === 'finished' ? '#5aaa6a' : '#b09060';

  right.innerHTML = `
    <div class="bop-stat">
      <span class="bop-stat-label">Status</span>
      <span class="bop-stat-value" style="color:${statusColor}">${statusLabel}</span>
    </div>
    ${book.status === 'reading' ? `
      <div class="bop-stat">
        <span class="bop-stat-label">Progress</span>
        <span class="bop-stat-value">${progress}%</span>
        <div class="bop-progress-track">
          <div class="bop-progress-fill" style="background:${color};width:0%"></div>
        </div>
      </div>` : ''}
    ${rInfo ? `
      <div class="bop-stat">
        <span class="bop-stat-label">Rating</span>
        <span class="bop-stat-value" style="color:${rInfo.color}">${rInfo.label}</span>
      </div>` : ''}
    ${book.genre ? `
      <div class="bop-stat">
        <span class="bop-stat-label">Genre</span>
        <span class="bop-stat-value">${esc(book.genre)}</span>
      </div>` : ''}
  `;

  backdrop.classList.add('visible');
  panel.classList.add('visible');

  // animate progress bar after visible
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = right.querySelector('.bop-progress-fill');
      if (fill) fill.style.width = `${progress}%`;
    });
  });
}

function closeBookPanel() {
  bopCloseTimer = setTimeout(() => {
    const panel    = document.getElementById('book-open-panel');
    const backdrop = document.getElementById('book-backdrop');
    if (panel)    panel.classList.remove('visible');
    if (backdrop) backdrop.classList.remove('visible');
  }, 200);
}

/* ── Shelf hover (lean + plank glow + open book) ────── */
function initShelf(shelf, plank, bookData) {
  const bookEls = Array.from(shelf.querySelectorAll('.book'));
  const glow    = plank.querySelector('.plank-glow');

  bookEls.forEach((el, i) => {
    const book = bookData[i];

    el.addEventListener('mouseenter', () => {
      clearTimeout(bopCloseTimer);

      // pop up
      el.style.transform  = 'translateY(-2rem)';
      el.style.boxShadow  = `0 0 18px ${book.spineColor}99, 0 -6px 22px ${book.spineColor}44`;

      // lean neighbors
      [-2, -1, 1, 2].forEach(d => {
        const nb = bookEls[i + d];
        if (nb) nb.style.transform = `rotate(${d < 0 ? -(2.5 / Math.abs(d)) : 2.5 / Math.abs(d)}deg)`;
      });

      // plank glow
      const br = el.getBoundingClientRect();
      const sr = shelf.getBoundingClientRect();
      glow.style.left  = `${br.left - sr.left + br.width / 2 - 24}px`;
      glow.style.width = `${br.width + 48}px`;
      plank.classList.add('lit');

      // open book panel
      openBookPanel(book);
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
      el.style.boxShadow = '';
      bookEls.forEach(b => { if (b !== el) b.style.transform = ''; });
      plank.classList.remove('lit');
      closeBookPanel();
    });
  });
}

/* ── Build a book spine element ──────────────────────── */
function buildBook(book) {
  const { h, w } = bookDims(book.title);
  const band      = book.status === 'finished' && book.rating ? RATING[book.rating]?.color : null;
  const progress  = book.status === 'reading' ? (book.progress ?? 0) : 100;

  const el = document.createElement('div');
  el.className = `book ${book.status}`;
  el.style.cssText = `width:${w}px;height:${h}px;background:${book.spineColor};--progress:${progress}%`;

  el.innerHTML = `
    <div class="book-inner">
      ${band ? `<div class="book-band" style="background:${band}"></div>` : ''}
      <div class="book-label-text">
        <span style="color:${book.textColor}">${esc(book.title)}</span>
      </div>
      <div class="book-progress"><div class="book-progress-fill"></div></div>
    </div>`;

  return el;
}

/* ── Render bookshelf ────────────────────────────────── */
function renderBooks(books) {
  const reading  = books.filter(b => b.status === 'reading');
  const finished = books.filter(b => b.status === 'finished');

  document.getElementById('page-meta').textContent =
    `${books.length} total · ${reading.length} in progress · ${finished.length} finished`;

  const shelfR = document.getElementById('shelf-reading');
  const shelfF = document.getElementById('shelf-finished');
  const plankR = document.getElementById('plank-reading');
  const plankF = document.getElementById('plank-finished');

  reading.forEach(b  => shelfR.appendChild(buildBook(b)));
  finished.forEach(b => shelfF.appendChild(buildBook(b)));

  initShelf(shelfR, plankR, reading);
  initShelf(shelfF, plankF, finished);

  // rating legend
  document.getElementById('rating-legend').innerHTML =
    Object.entries(RATING).reverse().map(([, v]) => `
      <span class="legend-item">
        <span class="legend-swatch" style="background:${v.color}"></span>
        <span>${v.label}</span>
      </span>`).join('');
}

/* ── Render games ────────────────────────────────────── */
function renderGames(games) {
  const playing = games.filter(g => g.status === 'playing');
  document.getElementById('page-meta').textContent =
    `${games.length} total · ${playing.length} active`;

  function buildGameCard(game) {
    const pc = PLATFORM_COLOR[game.platform] || '#8a7a6a';
    const sc = STATUS_COLOR[game.status]     || '#8a7a6a';
    const card = document.createElement('div');
    card.className = `card game-card ${game.status === 'playing' ? 'game-playing' : ''}`;
    card.innerHTML = `
      <div class="card-glare"></div>
      <div class="game-header">
        <span class="game-title">${esc(game.title)}</span>
        <span class="platform-badge" style="color:${pc};border-color:${pc}44">${esc(game.platform)}</span>
      </div>
      <span class="status-pill ${game.status}" style="color:${sc};border-color:${sc}33">
        <span class="status-dot" style="background:${sc}"></span>${game.status}
      </span>
      <p class="game-hours"><strong>${game.hours ?? 0}</strong> hrs</p>
      ${game.notes ? `<p class="game-notes">${esc(game.notes)}</p>` : ''}`;
    initTilt(card);
    return card;
  }

  const gridPlaying = document.getElementById('grid-playing');
  const gridOther   = document.getElementById('grid-other');
  const blockOther  = document.getElementById('block-other');
  const other       = games.filter(g => g.status !== 'playing');

  playing.forEach(g => gridPlaying.appendChild(buildGameCard(g)));
  if (other.length) {
    blockOther.style.display = '';
    other.forEach(g => gridOther.appendChild(buildGameCard(g)));
  }
}

/* ── Render projects ─────────────────────────────────── */
function renderProjects(projects) {
  const active = projects.filter(p => p.status === 'active');
  const done   = projects.filter(p => p.status !== 'active');

  document.getElementById('page-meta').textContent =
    `${projects.length} total · ${active.length} active`;

  function buildProjectCard(proj) {
    const card = document.createElement('div');
    card.className = `card project-card ${proj.status}`;
    card.innerHTML = `
      <div class="project-border"></div>
      <div class="card-glare"></div>
      <h3 class="project-name">${esc(proj.name)}</h3>
      <p class="project-status ${proj.status}">${proj.status.toUpperCase()}</p>
      <p class="project-desc">${esc(proj.description)}</p>
      <div class="tech-stack">
        ${(proj.tech || []).map(t => `<span class="tech-pill">${esc(t)}</span>`).join('')}
      </div>
      ${(proj.url || proj.repo) ? `
        <div class="project-links">
          ${proj.url  ? `<a class="project-link" href="${proj.url}"  target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Live</a>` : ''}
          ${proj.repo ? `<a class="project-link" href="${proj.repo}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>Repo</a>` : ''}
        </div>` : ''}`;
    initTilt(card);
    initPillWave(card);
    return card;
  }

  const gridActive = document.getElementById('grid-active');
  const gridDone   = document.getElementById('grid-done');
  const blockDone  = document.getElementById('block-done');

  active.forEach(p => gridActive.appendChild(buildProjectCard(p)));
  if (done.length) {
    blockDone.style.display = '';
    done.forEach(p => gridDone.appendChild(buildProjectCard(p)));
  }
}

/* ── Render home ─────────────────────────────────────── */
function renderHome(data) {
  const { about, books, games, projects } = data;

  document.getElementById('hero-name').textContent = about.name;
  document.getElementById('hero-bio').textContent  = about.bio;
  typewriter(document.getElementById('hero-tagline'), about.tagline);
  document.title = about.name;

  const reading = (books    || []).filter(b => b.status === 'reading');
  const playing = (games    || []).filter(g => g.status === 'playing');
  const active  = (projects || []).filter(p => p.status === 'active');

  document.getElementById('status-cards').innerHTML = `
    <a href="books.html" class="status-card">
      <span class="status-card-label">Reading</span>
      <span class="status-card-main">${reading[0] ? esc(reading[0].title) : 'Nothing on the shelf right now'}</span>
      <span class="status-card-sub">${reading[0] ? `by ${esc(reading[0].author)} · ${reading[0].progress ?? 0}% through` : '—'}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>
    <a href="games.html" class="status-card">
      <span class="status-card-label">Playing</span>
      <span class="status-card-main">${playing[0] ? esc(playing[0].title) : 'On a break'}</span>
      <span class="status-card-sub">${playing[0] ? `${esc(playing[0].platform)} · ${playing[0].hours ?? 0} hrs` : '—'}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>
    <a href="projects.html" class="status-card">
      <span class="status-card-label">Building</span>
      <span class="status-card-main">${active[0] ? esc(active[0].name) : 'Between projects'}</span>
      <span class="status-card-sub">${active.length} active project${active.length !== 1 ? 's' : ''}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>`;
}

/* ── Scroll observers ────────────────────────────────── */
function initObservers() {
  const shelfObs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.querySelectorAll('.book').forEach((b, i) => {
        setTimeout(() => b.classList.add('dropped'), i * 50);
      });
      shelfObs.unobserve(target);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.bookshelf').forEach(s => shelfObs.observe(s));

  const cardObs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.querySelectorAll('.card').forEach((c, i) => {
        setTimeout(() => c.classList.add('visible'), i * 90);
      });
      cardObs.unobserve(target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.card-grid').forEach(g => cardObs.observe(g));
}

/* ── Typewriter ──────────────────────────────────────── */
function typewriter(el, text, delay = 800, speed = 52) {
  let i = 0;
  function type() {
    el.innerHTML = esc(text.slice(0, i)) + '<span class="typewriter-caret"></span>';
    if (i++ <= text.length) setTimeout(type, speed + Math.random() * 30);
  }
  setTimeout(type, delay);
}

/* ── Boot ────────────────────────────────────────────── */
async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const page = document.body.dataset.page;

    if (page === 'home')     renderHome(data);
    if (page === 'books')  { initBookPanel(); renderBooks(data.books    || []); }
    if (page === 'games')    renderGames(data.games    || []);
    if (page === 'projects') renderProjects(data.projects || []);

    initObservers();
    window.dispatchEvent(new Event('content-ready'));
  } catch (err) {
    console.error('[dashboard] Failed to load data.json:', err);
    console.info('[dashboard] Run via a local server — try: npx serve personal-site');
  }
}

document.addEventListener('DOMContentLoaded', init);
