/* ── Config ──────────────────────────────────────────── */
// Update these if you rename your repo
const REPO_OWNER = 'AbyssLotus';
const REPO_NAME  = 'WeakTungsten';
const DATA_FILE  = 'data.json';

const HASH_KEY    = 'wt_admin_hash';
const SESSION_KEY = 'wt_authed';

/* ── Crypto ──────────────────────────────────────────── */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Auth ────────────────────────────────────────────── */
function isAuthed()  { return sessionStorage.getItem(SESSION_KEY) === '1'; }
function setAuthed() { sessionStorage.setItem(SESSION_KEY, '1'); }

function showError(msg) {
  document.getElementById('login-error').textContent = msg;
}

function buildLoginForm() {
  const hasHash = !!localStorage.getItem(HASH_KEY);
  const sub     = document.getElementById('login-sub');
  const fields  = document.getElementById('login-fields');

  if (!hasHash) {
    sub.textContent = 'SET UP YOUR PASSWORD';
    fields.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.6rem">
        <input type="password" id="pw1" placeholder="Choose a password" autocomplete="new-password">
        <input type="password" id="pw2" placeholder="Confirm password" autocomplete="new-password">
        <button id="btn-setup" style="margin-top:0.25rem">Create Password</button>
      </div>`;
    styleAuthBtn(document.getElementById('btn-setup'));
    document.getElementById('btn-setup').addEventListener('click', handleSetup);
    document.getElementById('pw2').addEventListener('keydown', e => { if (e.key === 'Enter') handleSetup(); });
  } else {
    sub.textContent = 'DASHBOARD EDITOR';
    fields.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.6rem">
        <input type="password" id="pw1" placeholder="Password" autocomplete="current-password">
        <button id="btn-login">Enter</button>
      </div>`;
    styleAuthBtn(document.getElementById('btn-login'));
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('pw1').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('pw1').focus();
  }
}

function styleAuthBtn(btn) {
  Object.assign(btn.style, {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--bg)',
    background: 'var(--red)',
    border: 'none',
    borderRadius: '4px',
    padding: '0.5rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.1rem',
  });
}

async function handleSetup() {
  const pw1 = document.getElementById('pw1').value;
  const pw2 = document.getElementById('pw2').value;
  if (!pw1) return showError('Enter a password.');
  if (pw1 !== pw2) return showError('Passwords do not match.');
  if (pw1.length < 6) return showError('Minimum 6 characters.');
  localStorage.setItem(HASH_KEY, await sha256(pw1));
  setAuthed();
  showError('');
  enterAdmin();
}

async function handleLogin() {
  const pw = document.getElementById('pw1').value;
  if (!pw) return showError('Enter your password.');
  const hash   = await sha256(pw);
  const stored = localStorage.getItem(HASH_KEY);
  if (hash !== stored) return showError('Incorrect password.');
  setAuthed();
  showError('');
  enterAdmin();
}

/* ── State ───────────────────────────────────────────── */
let draft = { about: {}, books: [], games: [], projects: [] };

/* ── GitHub API ──────────────────────────────────────── */
async function fetchData() {
  const res  = await fetch('data.json');
  if (!res.ok) throw new Error('Could not load data.json');
  return res.json();
}

async function pushToGitHub(token) {
  const apiBase = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`;

  // get current SHA
  const getRes = await fetch(apiBase, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  const current = await getRes.json();
  if (!getRes.ok) throw new Error(current.message || 'Failed to fetch file from GitHub');

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(draft, null, 2))));

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'dashboard: update content via admin',
      content,
      sha: current.sha,
    }),
  });
  const result = await putRes.json();
  if (!putRes.ok) throw new Error(result.message || 'GitHub API error');
  return result;
}

/* ── Admin entry ─────────────────────────────────────── */
async function enterAdmin() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-admin').style.display = 'block';

  draft = await fetchData();
  renderAll();
  initTabs();
  initSave();
}

/* ── Tabs ────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

/* ── Save ────────────────────────────────────────────── */
function initSave() {
  const patInput = document.getElementById('pat-input');
  const btn      = document.getElementById('btn-push');
  const status   = document.getElementById('save-status');

  // enable button when PAT is typed
  patInput.addEventListener('input', () => {
    btn.disabled = !patInput.value.trim();
  });

  // restore PAT from session
  const saved = sessionStorage.getItem('wt_pat');
  if (saved) { patInput.value = saved; btn.disabled = false; }

  patInput.addEventListener('change', () => {
    sessionStorage.setItem('wt_pat', patInput.value);
  });

  btn.addEventListener('click', async () => {
    const token = patInput.value.trim();
    if (!token) return;
    btn.disabled = true;
    status.className = '';
    status.textContent = 'Saving…';
    try {
      await pushToGitHub(token);
      status.className = 'ok';
      status.textContent = '✓ Saved — GitHub Pages will rebuild in ~30s';
    } catch (err) {
      status.className = 'err';
      status.textContent = `✗ ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ── Render all lists ────────────────────────────────── */
function renderAll() {
  renderBooks();
  renderGames();
  renderProjects();
}

/* ════════════════════════════════════════════════════════
   BOOKS
════════════════════════════════════════════════════════ */
function renderBooks() {
  const list = document.getElementById('list-books');
  list.innerHTML = '';
  draft.books.forEach((book, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-title">${esc(book.title)}</div>
        <div class="item-sub">${esc(book.author)} ${book.status === 'reading' ? `· ${book.progress ?? 0}%` : ''}</div>
      </div>
      <span class="item-badge badge-${book.status}">${book.status}</span>
      <button class="btn-icon" data-action="edit-book" data-i="${i}">Edit</button>
      <button class="btn-icon delete" data-action="del-book" data-i="${i}">✕</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.i;
      if (el.dataset.action === 'edit-book') showBookForm(i);
      if (el.dataset.action === 'del-book')  { draft.books.splice(i, 1); renderBooks(); }
    });
  });

  document.getElementById('add-book').onclick = () => showBookForm(null);
}

function showBookForm(index) {
  const book = index !== null ? draft.books[index] : {
    title: '', author: '', status: 'reading', progress: 0,
    rating: null, spineColor: '#2a1a3a', textColor: '#e0d0f0'
  };
  const container = document.getElementById('form-book');
  container.innerHTML = `
    <div class="item-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Title</label>
          <input type="text" id="b-title" value="${esc(book.title)}" placeholder="Book title">
        </div>
        <div class="form-field">
          <label>Author</label>
          <input type="text" id="b-author" value="${esc(book.author)}" placeholder="Author name">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select id="b-status">
            <option value="reading"  ${book.status === 'reading'  ? 'selected' : ''}>Reading</option>
            <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>Finished</option>
          </select>
        </div>
        <div class="form-field" id="b-progress-wrap">
          <label>Progress (%)</label>
          <input type="number" id="b-progress" min="0" max="100" value="${book.progress ?? 0}">
        </div>
        <div class="form-field" id="b-rating-wrap">
          <label>Rating (1–5)</label>
          <select id="b-rating">
            <option value="">—</option>
            ${[1,2,3,4,5].map(n => `<option value="${n}" ${book.rating == n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Spine Color</label>
          <input type="color" id="b-spine" value="${book.spineColor || '#2a1a3a'}">
        </div>
        <div class="form-field">
          <label>Text Color</label>
          <input type="color" id="b-text" value="${book.textColor || '#e0d0f0'}">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-save-item" id="b-save">Save Book</button>
        <button class="btn-cancel" id="b-cancel">Cancel</button>
      </div>
    </div>`;

  // toggle progress / rating visibility based on status
  const statusSel = document.getElementById('b-status');
  const progressW = document.getElementById('b-progress-wrap');
  const ratingW   = document.getElementById('b-rating-wrap');
  function toggleFields() {
    const r = statusSel.value === 'reading';
    progressW.style.display = r ? '' : 'none';
    ratingW.style.display   = r ? 'none' : '';
  }
  toggleFields();
  statusSel.addEventListener('change', toggleFields);

  document.getElementById('b-cancel').onclick = () => { container.innerHTML = ''; };
  document.getElementById('b-save').onclick = () => {
    const updated = {
      title:      document.getElementById('b-title').value.trim(),
      author:     document.getElementById('b-author').value.trim(),
      status:     document.getElementById('b-status').value,
      progress:   +document.getElementById('b-progress').value || 0,
      rating:     +document.getElementById('b-rating').value   || null,
      spineColor: document.getElementById('b-spine').value,
      textColor:  document.getElementById('b-text').value,
    };
    if (!updated.title || !updated.author) return alert('Title and author are required.');
    if (updated.status === 'reading')  updated.rating   = null;
    if (updated.status === 'finished') updated.progress = 100;
    if (index !== null) draft.books[index] = updated;
    else draft.books.push(updated);
    container.innerHTML = '';
    renderBooks();
  };
}

/* ════════════════════════════════════════════════════════
   GAMES
════════════════════════════════════════════════════════ */
function renderGames() {
  const list = document.getElementById('list-games');
  list.innerHTML = '';
  draft.games.forEach((game, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-title">${esc(game.title)}</div>
        <div class="item-sub">${esc(game.platform)} · ${game.hours ?? 0} hrs</div>
      </div>
      <span class="item-badge badge-${game.status}">${game.status}</span>
      <button class="btn-icon" data-action="edit-game" data-i="${i}">Edit</button>
      <button class="btn-icon delete" data-action="del-game" data-i="${i}">✕</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.i;
      if (el.dataset.action === 'edit-game') showGameForm(i);
      if (el.dataset.action === 'del-game')  { draft.games.splice(i, 1); renderGames(); }
    });
  });

  document.getElementById('add-game').onclick = () => showGameForm(null);
}

function showGameForm(index) {
  const game = index !== null ? draft.games[index] : {
    title: '', platform: 'PC', status: 'playing', hours: 0, notes: ''
  };
  const container = document.getElementById('form-game');
  container.innerHTML = `
    <div class="item-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Title</label>
          <input type="text" id="g-title" value="${esc(game.title)}" placeholder="Game title">
        </div>
        <div class="form-field">
          <label>Platform</label>
          <select id="g-platform">
            ${['PC','PS5','PS4','Xbox','Switch','Mobile'].map(p =>
              `<option ${game.platform === p ? 'selected' : ''}>${p}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Status</label>
          <select id="g-status">
            ${['playing','paused','finished','dropped'].map(s =>
              `<option value="${s}" ${game.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Hours Played</label>
          <input type="number" id="g-hours" min="0" value="${game.hours ?? 0}">
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label>Notes (optional)</label>
          <textarea id="g-notes" placeholder="Short note…">${esc(game.notes || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-save-item" id="g-save">Save Game</button>
        <button class="btn-cancel" id="g-cancel">Cancel</button>
      </div>
    </div>`;

  document.getElementById('g-cancel').onclick = () => { container.innerHTML = ''; };
  document.getElementById('g-save').onclick = () => {
    const updated = {
      title:    document.getElementById('g-title').value.trim(),
      platform: document.getElementById('g-platform').value,
      status:   document.getElementById('g-status').value,
      hours:    +document.getElementById('g-hours').value || 0,
      notes:    document.getElementById('g-notes').value.trim() || null,
    };
    if (!updated.title) return alert('Title is required.');
    if (index !== null) draft.games[index] = updated;
    else draft.games.push(updated);
    container.innerHTML = '';
    renderGames();
  };
}

/* ════════════════════════════════════════════════════════
   PROJECTS
════════════════════════════════════════════════════════ */
function renderProjects() {
  const list = document.getElementById('list-projects');
  list.innerHTML = '';
  draft.projects.forEach((proj, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-title">${esc(proj.name)}</div>
        <div class="item-sub">${(proj.tech || []).join(', ')}</div>
      </div>
      <span class="item-badge badge-${proj.status}">${proj.status}</span>
      <button class="btn-icon" data-action="edit-proj" data-i="${i}">Edit</button>
      <button class="btn-icon delete" data-action="del-proj" data-i="${i}">✕</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.i;
      if (el.dataset.action === 'edit-proj') showProjectForm(i);
      if (el.dataset.action === 'del-proj')  { draft.projects.splice(i, 1); renderProjects(); }
    });
  });

  document.getElementById('add-project').onclick = () => showProjectForm(null);
}

function showProjectForm(index) {
  const proj = index !== null ? draft.projects[index] : {
    name: '', description: '', tech: [], url: '', repo: '', status: 'active'
  };
  const container = document.getElementById('form-project');
  container.innerHTML = `
    <div class="item-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Name</label>
          <input type="text" id="p-name" value="${esc(proj.name)}" placeholder="Project name">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select id="p-status">
            ${['active','completed','paused'].map(s =>
              `<option value="${s}" ${proj.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label>Description</label>
          <textarea id="p-desc" placeholder="What does this project do?">${esc(proj.description || '')}</textarea>
        </div>
        <div class="form-field">
          <label>Tech Stack (comma-separated)</label>
          <input type="text" id="p-tech" value="${esc((proj.tech || []).join(', '))}" placeholder="HTML, CSS, JS">
        </div>
        <div class="form-field">
          <label>Live URL (optional)</label>
          <input type="url" id="p-url" value="${esc(proj.url || '')}" placeholder="https://…">
        </div>
        <div class="form-field">
          <label>Repo URL (optional)</label>
          <input type="url" id="p-repo" value="${esc(proj.repo || '')}" placeholder="https://github.com/…">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-save-item" id="p-save">Save Project</button>
        <button class="btn-cancel" id="p-cancel">Cancel</button>
      </div>
    </div>`;

  document.getElementById('p-cancel').onclick = () => { container.innerHTML = ''; };
  document.getElementById('p-save').onclick = () => {
    const techRaw = document.getElementById('p-tech').value;
    const updated = {
      name:        document.getElementById('p-name').value.trim(),
      description: document.getElementById('p-desc').value.trim(),
      tech:        techRaw.split(',').map(t => t.trim()).filter(Boolean),
      url:         document.getElementById('p-url').value.trim()  || null,
      repo:        document.getElementById('p-repo').value.trim() || null,
      status:      document.getElementById('p-status').value,
    };
    if (!updated.name) return alert('Name is required.');
    if (index !== null) draft.projects[index] = updated;
    else draft.projects.push(updated);
    container.innerHTML = '';
    renderProjects();
  };
}

/* ── Helpers ─────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthed()) {
    enterAdmin();
  } else {
    buildLoginForm();
  }
});
