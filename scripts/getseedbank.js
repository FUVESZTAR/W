import { loadPlantDataSB } from "./sheet-loader.js";
import { splitPipe } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";
import { makeSelectSearchable } from "./searchable-select.js";

// ── Debug helpers ────────────────────────────────────────────────────────────
const debugLines = [];
function dbg(msg, level = 'info') {
  const cls = level === 'ok' ? 'dbg-ok' : level === 'warn' ? 'dbg-warn' : level === 'err' ? 'dbg-err' : '';
  debugLines.push(cls ? `<span class="${cls}">${escHtml(msg)}</span>` : escHtml(msg));
  const panel = document.getElementById('debug-panel');
  if (panel) panel.innerHTML = debugLines.join('\n');
}
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// ────────────────────────────────────────────────────────────────────────────

document.getElementById('back-button').addEventListener('click', () => {
  window.location.href = '../Homepage.html';
});

document.getElementById('debug-toggle').addEventListener('click', () => {
  const panel = document.getElementById('debug-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// ── Constants ─────────────────────────────────────────────────────────────────
// Used as colspan for loading/error rows before the real column count is known.
const FALLBACK_COLSPAN = 50;

// ── State ────────────────────────────────────────────────────────────────────
let allRows    = [];   // all rows loaded from seed_bank
let columns    = [];   // ordered list of column names
const filters  = {};   // { colName: selectedValue }
const searchables = {}; // { colName: searchable instance }

// ── Helpers ──────────────────────────────────────────────────────────────────
function unique(arr) {
  return [...new Set(arr.filter(v => v !== '' && v != null))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function colValuesFor(col, rows) {
  if (col === 'Name_Variety') {
    return unique(rows.flatMap(r => splitPipe(r[col])));
  }
  return unique(rows.map(r => String(r[col] != null ? r[col] : '')).filter(Boolean));
}

/** Returns rows that pass all active filters EXCEPT the given column. */
function rowsExcluding(excludeCol) {
  return allRows.filter(row => {
    for (const col of columns) {
      if (col === excludeCol) continue;
      const val = filters[col] || '';
      if (!val) continue;
      if (col === 'Name_Variety') {
        if (!splitPipe(row[col]).includes(val)) return false;
      } else {
        if (String(row[col] != null ? row[col] : '') !== val) return false;
      }
    }
    return true;
  });
}

/** Returns rows that pass ALL active filters. */
function getFilteredRows() {
  return rowsExcluding(null);
}

function buildDropdown(selectEl, values, placeholder) {
  const current = filters[selectEl.dataset.col] || '';
  selectEl.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = placeholder;
  selectEl.appendChild(all);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = String(v);
    selectEl.appendChild(opt);
  });
  selectEl.value = values.map(String).includes(current) ? current : '';
}

// ── Build filter bar ─────────────────────────────────────────────────────────
function buildFilterBar() {
  const container = document.getElementById('filter-bar-container');
  if (!container) return;
  container.innerHTML = '';

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'filter-col';

    const label = document.createElement('small');
    label.className = 'filter-col-label';
    label.textContent = col;
    label.title = col;

    const searchId = `dd-col-search-${col}`;
    const selectId = `dd-col-${col}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = searchId;
    input.className = 'select-search-input';
    input.placeholder = 'Search…';
    input.autocomplete = 'off';

    const select = document.createElement('select');
    select.id = selectId;
    select.dataset.col = col;

    colDiv.appendChild(label);
    colDiv.appendChild(input);
    colDiv.appendChild(select);
    container.appendChild(colDiv);
  });
}

// ── Build table head ─────────────────────────────────────────────────────────
function buildTableHead() {
  const thead = document.getElementById('table-head');
  if (!thead) return;
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

// ── Render table rows ────────────────────────────────────────────────────────
function renderRows(rows) {
  const tbody = document.getElementById('plant-list-body');
  const colCount = columns.length || 1;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colCount}">${t('list.empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      const val = row[col];
      td.textContent = (val != null && val !== '') ? String(val) : '';
      tr.appendChild(td);
    });
    if (row['Plant_ID']) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        localStorage.setItem('selectedPlantNr', row['Plant_ID']);
        window.location.href = `P.html?id=${encodeURIComponent(row['Plant_ID'])}`;
      });
    }
    tbody.appendChild(tr);
  });
}

// ── Rebuild all dropdowns (cascading: each shows values available given others) ─
function rebuildAllDropdowns() {
  columns.forEach(col => {
    const selectEl = document.getElementById(`dd-col-${col}`);
    if (!selectEl) return;
    const availableRows = rowsExcluding(col);
    const values = colValuesFor(col, availableRows);
    buildDropdown(selectEl, values, `— ${col} —`);
    if (searchables[col]) searchables[col].refresh();
  });
}

// ── Wire up filter events ────────────────────────────────────────────────────
function wireFilterEvents() {
  columns.forEach(col => {
    const selectEl = document.getElementById(`dd-col-${col}`);
    if (!selectEl) return;
    searchables[col] = makeSelectSearchable(selectEl, `dd-col-search-${col}`);
    selectEl.addEventListener('change', () => {
      filters[col] = selectEl.value;
      rebuildAllDropdowns();
      renderRows(getFilteredRows());
      updateFilterSummary();
    });
  });
}

// ── Filter summary ────────────────────────────────────────────────────────────
function updateFilterSummary() {
  const el = document.getElementById('filter-summary');
  if (!el) return;
  const active = columns.filter(c => filters[c]);
  if (!active.length) {
    el.textContent = '';
    return;
  }
  el.textContent = active.map(c => `${c}: "${filters[c]}"`).join('  ·  ');
}

// ── Apply URL params ──────────────────────────────────────────────────────────
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const filterType  = params.get('filterType')  || '';
  const filterValue = params.get('filterValue') || '';

  // Legacy filterType/filterValue from P.html links
  const legacyMap = {
    family:   'Family',
    genus:    'Genus',
    seedbank: 'Seedbank',
    year:     'Year',
    latin:    'LatinName',
  };
  if (filterValue && filterType && legacyMap[filterType]) {
    filters[legacyMap[filterType]] = filterValue;
  }

  // Per-column params: ?col_Family=Rosaceae, ?col_Year=2023 …
  for (const [key, value] of params.entries()) {
    if (key.startsWith('col_')) {
      const col = key.slice(4);
      if (columns.includes(col) && value) filters[col] = value;
    }
  }

  // Legacy named params
  const legacyParams = {
    family:  'Family',
    genus:   'Genus',
    seedbank: 'Seedbank',
    year:    'Year',
    latin:   'LatinName',
    nameHu:  'Name_HU',
    nameEn:  'Name_EN',
    variety: 'Name_Variety',
  };
  for (const [param, col] of Object.entries(legacyParams)) {
    const v = params.get(param);
    if (v && columns.includes(col)) filters[col] = v;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function populate() {
  const errorMsg = document.getElementById('error-message');

  dbg('── seed_bank fetch ──────────────────────────');
  let rows = [];
  try {
    rows = await loadPlantDataSB();
    dbg(`seed_bank rows loaded: ${rows.length}`, rows.length > 0 ? 'ok' : 'warn');
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      dbg(`seed_bank columns (${headers.length}): ${headers.join(', ')}`);
      dbg('seed_bank row[0]: ' + JSON.stringify(rows[0]));
    }
  } catch (err) {
    dbg(`seed_bank ERROR: ${err.message}`, 'err');
    console.error(err);
    if (errorMsg) errorMsg.textContent = t('list.error.loadFailed');
    document.getElementById('plant-list-body').innerHTML =
      `<tr><td colspan="${FALLBACK_COLSPAN}">${t('list.error.loadData')}</td></tr>`;
    return;
  }

  if (!rows.length) {
    dbg('No rows returned from seed_bank', 'warn');
    document.getElementById('plant-list-body').innerHTML =
      `<tr><td colspan="${FALLBACK_COLSPAN}">${t('list.empty')}</td></tr>`;
    return;
  }

  allRows = rows;
  columns = Object.keys(rows[0]);
  dbg(`columns: ${columns.join(', ')}`, 'ok');

  // Sort rows by LatinName if present, otherwise by first column
  const sortCol = columns.includes('LatinName') ? 'LatinName' : columns[0];
  allRows.sort((a, b) => String(a[sortCol] || '').localeCompare(String(b[sortCol] || '')));

  // Build UI
  buildFilterBar();
  buildTableHead();
  applyUrlParams();
  wireFilterEvents();
  rebuildAllDropdowns();

  // Apply any URL-param filters to the dropdowns
  columns.forEach(col => {
    if (filters[col]) {
      const sel = document.getElementById(`dd-col-${col}`);
      if (sel) {
        sel.value = filters[col];
        if (searchables[col]) searchables[col].refresh();
      }
    }
  });

  renderRows(getFilteredRows());
  updateFilterSummary();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}

