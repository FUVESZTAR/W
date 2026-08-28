const SHEET_ID = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
const SHEET_NAME = 'plant_list';
const SHEET_NAME2 = 'seed_bank';
//- fetch
/** old
 * Fetch raw Google Visualization API response for the plant data sheet.
 * Returns the parsed JSON object (the argument passed to setResponse).
 */
async function fetchSheetResponse() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  // The API wraps the JSON in a callback: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  return JSON.parse(match[1]);
}
 /** new 
 * Fetch raw Google Visualization API response with an optional TQ query.
 */
async function fetchSheetResponseQr(tq = '') {
  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: SHEET_NAME,
    ...(tq && { tq }),
  });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  const parsed = JSON.parse(match[1]);
  if (parsed.status === 'error') {
    const msg = parsed.errors && parsed.errors[0]
      ? `${parsed.errors[0].reason}: ${parsed.errors[0].message}`
      : 'unknown gviz error';
    throw new Error(`Google Visualization API error (sheet="${SHEET_NAME}"): ${msg}`);
  }
  return parsed;
}

 /** new 
 * Fetch raw Google Visualization API response with an optional TQ query.
 */
async function fetchSheetResponseSB(tq = '') {
  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: SHEET_NAME2,
    headers: '1',
    ...(tq && { tq }),
  });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  const parsed = JSON.parse(match[1]);
  if (parsed.status === 'error') {
    const msg = parsed.errors && parsed.errors[0]
      ? `${parsed.errors[0].reason}: ${parsed.errors[0].message}`
      : 'unknown gviz error';
    throw new Error(`Google Visualization API error (sheet="${SHEET_NAME2}"): ${msg}`);
  }
  return parsed;
}

// Helper to generate column letters from a range (supports A–Z and AA–ZZ)
// 64 = char code of '@' so charCode - 64 maps 'A'→1, 'B'→2, …, 'Z'→26
function colRange(start, end) {
  const toNum = s => s.length === 1
    ? s.charCodeAt(0) - 64                                            // single-letter: A=1 … Z=26
    : (s.charCodeAt(0) - 64) * 26 + (s.charCodeAt(1) - 64);          // two-letter:   AA=27 … ZZ=702
  const fromNum = n => n <= 26
    ? String.fromCharCode(64 + n)                                     // 1–26 → A–Z
    : String.fromCharCode(64 + Math.floor((n - 1) / 26)) + String.fromCharCode(64 + ((n - 1) % 26) + 1); // 27+ → AA…
  const cols = [];
  const startN = toNum(start);
  const endN = toNum(end);
  for (let i = startN; i <= endN; i++) {
    cols.push(fromNum(i));
  }
  return cols;
}
/*
// Build your column selection
const selectedCols = [
  ...colRange('A', 'CT'),   // A through X
  'CV', 'CW', 'CX'          // plus individual extras
].join(', ');

//const tq = `select ${selectedCols} where A = ${plantId} limit 1`;
// → "select A, B, C, D, ..., X, AC, AF where A = 1 limit 1"
*/


/**
 * Load all plant rows from the Google Sheet.
 * Returns an array of plain objects where each key is a column header from the sheet
 * and values are native types (numbers stay numbers, strings stay strings, empty cells become "").
 */
export async function loadPlantData() {
  const gvizResponse = await fetchSheetResponse();
  const { cols, rows } = gvizResponse.table;
  console.log("loadPlantData");
  // Use column label (the sheet header row) as the property key, falling back to column id
  const headers = cols.map(col => (col.label && col.label.trim()) ? col.label.trim() : col.id);

  return rows
    // Filter out completely empty rows (Google Sheets sometimes appends null-filled rows).
    // Rows containing 0 or false are intentionally preserved as non-empty data.
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        // Preserve native type: use .v (raw value). Empty cells become empty string.
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}

// new

/**
 * Load a single plant row whose "LatinName" (column B) matches the given input.
 * Only that one row + the header is fetched from the sheet — minimal data transfer.
 *
 * @param {string} latinName - The LatinName value to match exactly.
 * @returns {Object|null} A plain object with sheet headers as keys, or null if not found.
 */
export async function loadPlantByLatinName(latinName) {
  // GViz TQ query: select all columns where column B equals the input value.
  // 'limit 1' ensures we stop after the first match.
  const tq = `select * where B = '${latinName.replace(/'/g, "\\'")}' limit 1`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  const validRows = rows.filter(
    row => row && row.c && row.c.some(cell => cell && cell.v != null)
  );

  if (validRows.length === 0) return null;

  const row = validRows[0];
  const entry = {};
  headers.forEach((header, index) => {
    const cell = row.c[index];
    entry[header] = (cell && cell.v != null) ? cell.v : '';
  });
  return entry;
}

/* use
const plant = await loadPlantByLatinName('Rosa canina');
if (plant) {
  console.log(plant.CommonName, plant.Family);
} else {
  console.log('Not found');
}*/

/**
 * Load all Name_Variety values (column C) for a given LatinName (column B).
 * Only columns B and C are fetched — minimal data transfer.
 *
 * @param {string} latinName - The LatinName value to match.
 * @returns {string[]} Array of Name_Variety values matching the given LatinName.
 */
export async function loadVarietiesByLatinName(latinName) {
  const tq = `select C where B = '${latinName.replace(/'/g, "\\'")}' `;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { rows } = gvizResponse.table;

  return rows
    .filter(row => row && row.c && row.c[0] && row.c[0].v != null)
    .map(row => row.c[0].v);
}
/* use 
const varieties = await loadVarietiesByLatinName('Rosa canina');
console.log(varieties); // ['variety one', 'variety two', ...] */

//best for Plant view ? Plant info:

/**
 * Load a single plant's full row data AND all its Name_Variety values
 * in a single network request.
 *
 * @param {string} latinName - The LatinName value to match.
 * @returns {{ plant: Object|null, varieties: string[] }}
 */
export async function loadPlantWithVarieties(latinName) {
  const tq = `select * where B = '${latinName.replace(/'/g, "\\'")}'`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  const validRows = rows.filter(
    row => row && row.c && row.c.some(cell => cell && cell.v != null)
  );

  if (validRows.length === 0) return { plant: null, varieties: [] };

  // First matching row = the representative plant entry
  const plant = {};
  headers.forEach((header, index) => {
    const cell = validRows[0].c[index];
    plant[header] = (cell && cell.v != null) ? cell.v : '';
  });

  // All matching rows → extract Name_Variety (column C, index 2)
  const varietyIndex = headers.indexOf('Name_Variety');
  
  const varieties = validRows
    .map(row => {
      const cell = row.c[varietyIndex];
      return (cell && cell.v != null) ? cell.v : null;
    })
    .filter(v => v !== null);

  return { plant, varieties };
}

/* use 
const { plant, varieties } = await loadPlantWithVarieties('Rosa canina');
console.log(plant);     // { LatinName: 'Rosa canina', Family: '...', ... }
console.log(varieties); // ['variety one', 'variety two', ...]
*/

/** For NFC Generator page
 * Load Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN
 * for all rows where Active_in_NFC = "Y".
 * Minimal traffic: only 5 columns, only active rows.
 *
 * @returns {Object[]} Array of plant objects with the selected fields.
 */
export async function loadActiveNFCPlants() {
  // You must use column letters, not header names, in the tq query
  // A=Plant_ID, B=LatinName, C=Name_Variety, D=Name_HU, E=Name_EN , CR = Active_in_NFC
  // Adjust the letters if your columns are in a different order!
  const tq = `select A, B, C, D, E where CR = 'Y'`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}

/**  For Plant List , PlantPage
 * Load Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN, Genus, Family
 * for all rows where Active_in_page = "Y".
 * Minimal traffic: only 7 columns, only active rows.
 *
 * @returns {Object[]} Array of plant objects with the selected fields.
 */
export async function loadActivePagePlants() {
  // You must use column letters, not header names, in the tq query
  // A=Plant_ID, B=LatinName, C=Name_Variety, D=Name_HU, E=Name_EN, F=Genus, G=Family, CQ=Active_in_page
  // Adjust the letters if your columns are in a different order!
  const tq = `select A, B, C, D, E, F, G where CQ = 'Y'`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}

/**  For Plant List when navigating from a plant page (all plants, no Active_in_page filter).
 * Loads Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN, Genus, Family for every row.
 * Used when the user arrives via filterType/filterValue (e.g. clicking a genus link on P.html)
 * so that all members of a genus/family/latin name are shown regardless of their active flag.
 *
 * @returns {Object[]} Array of plant objects with the selected fields.
 */
export async function loadAllPagePlants() {
  // A=Plant_ID, B=LatinName, C=Name_Variety, D=Name_HU, E=Name_EN, F=Genus, G=Family
  const tq = `select A, B, C, D, E, F, G`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}

/* use 
// 1. Basic — just load and log all active plants
const plants = await loadActivePlants();
console.log(plants);
// [
//   { Plant_ID: 1, LatinName: 'Rosa canina', Name_Variety: '...', Name_HU: '...', Name_EN: '...' },
//   { Plant_ID: 2, LatinName: 'Quercus robur', Name_Variety: '...', ... },
//   ...
// ]*/
// helper function
function cellValue(cell) {
  if (!cell) return '';
  if (cell.v != null) return cell.v;
  if (cell.f != null) return cell.f;
  return '';
}

/**  For Plant View ("P") page , Plantinfo.js
 * Load full plant data and all its varieties by Plant_ID (column A).
 *
 * @param {number|string} plantId - The Plant_ID to look up.
 * @returns {{ plant: Object|null, varieties: string[] }}
 */
export async function loadPlantIdWithVarieties(plantId) {
   //plantinfo uses this
  // Step 1: fetch the single row matching the Plant_ID
  // If Plant_ID is stored as a NUMBER in the sheet (e.g. 1, 42):
  const tq1 = `select * where A = ${plantId} limit 1`;
  const gvizResponse1 = await fetchSheetResponseQr(tq1);
  const { cols, rows: rows1 } = gvizResponse1.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  const validRows1 = rows1.filter(
    row => row && row.c && row.c.some(cell => cell && cell.v != null)
  );

  if (validRows1.length === 0) return { plant: null, varieties: [] };
/*
    // Build the plant object from the first (and only) row
  const plant = {};
  headers.forEach((header, index) => {
    const cell = validRows1[0].c[index];
    plant[header] = (cell && cell.v != null) ? cell.v : '';
  });
  */
  // Build the plant object from the first (and only) row
  const plant = {};
  headers.forEach((header, index) => {
    const cell = validRows1[0].c[index];
    plant[header] = cellValue(cell);
  });

  // Step 2: fetch all Name_Variety values sharing the same LatinName
  const latinName = plant['LatinName'];
  //const tq2 = `select C where B = '${latinName.replace(/'/g, "\\'")}'`;
  const tq2 = `select A, TO_TEXT(C) where B = '${latinName.replace(/'/g, "\\'")}'`;
  const gvizResponse2 = await fetchSheetResponseQr(tq2);
  const { rows: rows2 } = gvizResponse2.table;


  const varieties = rows2
    .filter(row => row && row.c && row.c[1] && (row.c[1].v != null || row.c[1].f != null))
    .map(row => ({
      Plant_ID:     cellValue(row.c[0]),
      Name_Variety: cellValue(row.c[1]),
    }));
  /*
  const varieties = rows2
  .filter(row => row && row.c && row.c[1] && row.c[1].v != null)
  .map(row => ({
    Plant_ID:     row.c[0]?.v ?? '',
    Name_Variety: row.c[1]?.v ?? '',
  }));*/

  return { plant, varieties };
}
/* use 
const { plant, varieties } = await loadPlantWithVarieties(42);
console.log(plant.LatinName);  // 'Rosa canina'
console.log(varieties);         // ['variety one', 'variety two', ...]
*/

/**
 * Load all plant rows from the Google Sheet.
 * Returns an array of plain objects where each key is a column header from the sheet
 * and values are native types (numbers stay numbers, strings stay strings, empty cells become "").
 */
// Normalise common column-header variants to the canonical property names used in
// getseedbank.js so that minor naming differences in the Google Sheet are tolerated.
// Maps normalised (lowercased) column-header variants to the canonical property names used
// throughout getseedbank.js.  All keys must be lowercase because normaliseSBHeader() applies
// .toLowerCase() before the lookup.  The canonical values keep their original casing.
const SB_HEADER_ALIASES = {
  // Plant_ID variants
  'plant_id':            'Plant_ID',
  'plant id':            'Plant_ID',
  'plantid':             'Plant_ID',
  // LatinName variants
  'latinname':           'LatinName',
  'latin_name':          'LatinName',
  'latin name':          'LatinName',
  // Name_Variety variants
  'name_variety':        'Name_Variety',
  'namevariety':         'Name_Variety',
  'name variety':        'Name_Variety',
  // Name_HU variants
  'name_hu':             'Name_HU',
  'namehu':              'Name_HU',
  'name hu':             'Name_HU',
  // Name_EN variants
  'name_en':             'Name_EN',
  'nameen':              'Name_EN',
  'name en':             'Name_EN',
  // Seedbank variants (including Hungarian)
  'seedbank':            'Seedbank',
  'seed_bank':           'Seedbank',
  'seed bank':           'Seedbank',
  'magbank':             'Seedbank',
  // Year variants (including Hungarian)
  'year':                'Year',
  'év':                  'Year',
  // Seed_availability variants (including Hungarian)
  'seed_availability':   'Seed_availability',
  'seedavailability':    'Seed_availability',
  'seed availability':   'Seed_availability',
  'seed_av':             'Seed_availability',
  'mag_elérhetőség':     'Seed_availability',
  'mag elérhetőség':     'Seed_availability',
  // Genus variants
  'genus':               'Genus',
  'nemzetség':           'Genus',
  // Family variants
  'family':              'Family',
  'család':              'Family',
};

function normaliseSBHeader(raw) {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  return SB_HEADER_ALIASES[key] || raw;
}

export async function loadPlantDataSB() {
  const tq = 'select A, B, C, D, E, F, G, H, I, J';
  const gvizResponse = await fetchSheetResponseSB(tq);
  const { cols, rows } = gvizResponse.table;
  // Use column label (the sheet header row) as the property key, falling back to column id,
  // then normalise to canonical names so minor naming differences are tolerated.
  const headers = cols.map(col =>
    normaliseSBHeader((col.label && col.label.trim()) ? col.label.trim() : col.id)
  );

  return rows
    // Filter out rows where every cell is either null or an empty string – these are either
    // Google Sheets padding rows or formula-placeholder rows with no real data yet.
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null && cell.v !== ''))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        // Preserve native type: use .v (raw value). Empty cells become empty string.
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}


/**  For Seedbank page — load Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN, Genus, Family for all rows.
 * Columns: A=Plant_ID, B=LatinName, C=Name_Variety, D=Name_HU, E=Name_EN, F=Genus, G=Family
 *
 * @returns {Object[]} Array of plant objects with the selected fields.
 */
export async function loadPlantIdPlSB2() {
  const selectedCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].join(', ');
  const tq = `select ${selectedCols}`;

  const gvizResponse = await fetchSheetResponseQr(tq);
  const { cols, rows } = gvizResponse.table;

  const headers = cols.map(col =>
    (col.label && col.label.trim()) ? col.label.trim() : col.id
  );

  return rows
    .filter(row => row && row.c && row.c.some(cell => cell && cell.v != null))
    .map(row => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = (cell && cell.v != null) ? cell.v : '';
      });
      return entry;
    });
}
