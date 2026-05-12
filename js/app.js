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

/* ── Shelf hover (lean + plank glow) ─────────────────── */
function initShelf(shelf, plank) {
  const books = Array.from(shelf.querySelectorAll('.book'));
  const glow  = plank.querySelector('.plank-glow');

  books.forEach((book, i) => {
    book.addEventListener('mouseenter', () => {
      book.style.transform = 'translateY(-2rem)';
      book.style.boxShadow = `0 0 16px ${book.style.background}99, 0 -6px 20px ${book.style.background}44`;

      [-2, -1, 1, 2].forEach(d => {
        const nb = books[i + d];
        if (nb) nb.style.transform = `rotate(${d < 0 ? -(2.5 / Math.abs(d)) : 2.5 / Math.abs(d)}deg)`;
      });

      const br = book.getBoundingClientRect();
      const sr = shelf.getBoundingClientRect();
      const cx = br.left - sr.left + br.width / 2;
      glow.style.left  = `${cx - 24}px`;
      glow.style.width = `${br.width + 48}px`;
      plank.classList.add('lit');
    });

    book.addEventListener('mouseleave', () => {
      book.style.transform = '';
      book.style.boxShadow = '';
      books.forEach(b => { if (b !== book) b.style.transform = ''; });
      plank.classList.remove('lit');
    });
  });
}

/* ── Build a book element ────────────────────────────── */
function buildBook(book) {
  const { h, w } = bookDims(book.title);
  const band     = book.status === 'finished' && book.rating ? RATING[book.rating]?.color : null;
  const progress = book.status === 'reading'  ? (book.progress ?? 0) : 100;

  const el = document.createElement('div');
  el.className = `book ${book.status}`;
  el.style.cssText = `width:${w}px;height:${h}px;background:${book.spineColor};--progress:${progress}%`;

  el.innerHTML = `
    ${band ? `<div class="book-band" style="background:${band}"></div>` : ''}
    <div class="book-label-text">
      <span style="color:${book.textColor}">${esc(book.title)}</span>
    </div>
    <div class="book-progress"><div class="book-progress-fill"></div></div>
    <div class="book-tip">
      <span class="tip-title">${esc(book.title)}</span>
      <span class="tip-author">${esc(book.author)}</span>
      ${book.status === 'reading' ? `<span class="tip-extra" style="color:var(--amber)">${progress}% through</span>` : ''}
      ${band ? `<span class="tip-extra" style="color:${band}">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</span>` : ''}
    </div>
  `;
  return el;
}

/* ── Scroll observers ────────────────────────────────── */
function initObservers() {
  // book drop-in
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

  // card slide-in
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

/* ── Page: Home ──────────────────────────────────────── */
function renderHome(data) {
  const { about, books, games, projects } = data;

  document.getElementById('hero-name').textContent = about.name;
  document.getElementById('hero-bio').textContent  = about.bio;
  typewriter(document.getElementById('hero-tagline'), about.tagline);
  document.title = about.name;

  const reading = (books   || []).filter(b => b.status === 'reading');
  const playing = (games   || []).filter(g => g.status === 'playing');
  const active  = (projects|| []).filter(p => p.status === 'active');

  const currentBook    = reading[0]  || null;
  const currentGame    = playing[0]  || null;
  const currentProject = active[0]   || null;

  document.getElementById('status-cards').innerHTML = `
    <a href="books.html" class="status-card">
      <span class="status-card-label">Reading</span>
      <span class="status-card-main">${currentBook ? esc(currentBook.title) : 'Nothing on the shelf right now'}</span>
      <span class="status-card-sub">${currentBook ? `by ${esc(currentBook.author)} · ${currentBook.progress ?? 0}% through` : '—'}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>
    <a href="games.html" class="status-card">
      <span class="status-card-label">Playing</span>
      <span class="status-card-main">${currentGame ? esc(currentGame.title) : 'On a break'}</span>
      <span class="status-card-sub">${currentGame ? `${esc(currentGame.platform)} · ${currentGame.hours ?? 0} hrs` : '—'}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>
    <a href="projects.html" class="status-card">
      <span class="status-card-label">Building</span>
      <span class="status-card-main">${currentProject ? esc(currentProject.name) : 'Between projects'}</span>
      <span class="status-card-sub">${active.length} active project${active.length !== 1 ? 's' : ''}</span>
      <span class="status-card-link">Browse all <span class="arrow">→</span></span>
    </a>
  `;
}

/* ── Page: Books ─────────────────────────────────────── */
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

  initShelf(shelfR, plankR);
  initShelf(shelfF, plankF);

  // rating legend
  const legend = document.getElementById('rating-legend');
  legend.innerHTML = Object.entries(RATING).reverse().map(([, v]) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${v.color}"></span>
      <span>${v.label}</span>
    </span>
  `).join('');
}

/* ── Page: Games ─────────────────────────────────────── */
function renderGames(games) {
  const playing = games.filter(g => g.status === 'playing');
  const other   = games.filter(g => g.status !== 'playing');

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
      ${game.notes ? `<p class="game-notes">${esc(game.notes)}</p>` : ''}
    `;
    initTilt(card);
    return card;
  }

  const gridPlaying = document.getElementById('grid-playing');
  const gridOther   = document.getElementById('grid-other');
  const blockOther  = document.getElementById('block-other');

  playing.forEach(g => gridPlaying.appendChild(buildGameCard(g)));

  if (other.length) {
    blockOther.style.display = '';
    other.forEach(g => gridOther.appendChild(buildGameCard(g)));
  }
}

/* ── Page: Projects ──────────────────────────────────── */
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
        </div>` : ''}
    `;
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

/* ── Boot ────────────────────────────────────────────── */
async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const page = document.body.dataset.page;

    if (page === 'home')     renderHome(data);
    if (page === 'books')    renderBooks(data.books    || []);
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
