// =============================================================
// Google Apps Script Web App – NFC list writer (hardened)
// + NEW: action "nfcSerials" -> saves serial numbers / content to reg_list
// =============================================================
// DEPLOY:
//  1. script.google.com > new project > paste this file.
//  2. Project Settings > Script Properties > add  SECRET_KEY = <long random value>
//     (generate with: openssl rand -hex 24). Put the same value into CFG.SECRET
//     of the web page.
//  3. Deploy > New deployment > Web app. Execute as: Me. Access: "Anyone".
//  4. After EVERY edit: Deploy > Manage deployments > Edit > New version.
//
// NOTE: the key in the web page is visible to anyone, so it is only a spam
// filter. The real protection is the validation, locking and rate limits below.
// =============================================================

var SPREADSHEET_ID = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
var SHEET_NAME_NFC = 'nfc_list';
var SHEET_NAME_PIN = 'pin_list';
var SHEET_NAME_REG = 'reg_list';   // NEW: serial number (col A) + content (col B)
var RATE_LIMIT     = 20;           // max POST requests per minute (all clients together)
var BAD_KEY_LIMIT  = 5;            // max wrong-key attempts per minute, then block everything
var MAX_REG_ROWS   = 200;          // NEW: max tags per request

// nfc_list column order: nfcId, plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, serialNum, comment
var DATE_RE   = /^\d{4}-\d{2}-\d{2}$/;
var HTML_RE   = /<[^>]*>/;
var CTRL_RE   = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;   // control chars (tab/newline allowed)
var GPS_RE    = /^L\|[A-Za-z0-9+\/=]{16,24}\|L$/;
var SERIAL_RE = /^[0-9A-Fa-f:\-]{0,40}$/;
var SERIAL_REQ_RE = /^[0-9A-Fa-f:\-]{1,40}$/;   // NEW: serial required (reg_list)

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

/** Constant-time string comparison (avoids timing leaks of the key). */
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function text_(v) { return String(v == null ? '' : v).trim(); }

/** Serial normalised for comparison: upper case, no ":" or "-". */
function normSerial_(s) { return String(s).toUpperCase().replace(/[:\-]/g, ''); }

/** Highest numeric id in column A (robust against sorting / blank rows). */
function maxNfcId_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var vals = sheet.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < vals.length; i++) {
    var n = Number(vals[i][0]);
    if (isFinite(n) && n > max) max = n;
  }
  return max;
}

/** GET – returns the last NFC id so the client can pre-fill the next one. */
function doGet() {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_NFC);
    return json_({ lastId: String(maxNfcId_(sheet)) });
  } catch (err) {
    console.error(err);
    return json_({ error: 'Server error.' });
  }
}

/** POST – auth, rate limit, lock, then route by data.action. */
function doPost(e) {
  var cache = CacheService.getScriptCache();
  var minute = Math.floor(Date.now() / 60000);

  // ── Parse body ───────────────────────────────────────────────
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (_) { return json_({ error: 'Invalid request format.' }); }
  if (!data || typeof data !== 'object') return json_({ error: 'Invalid request format.' });

  // ── Block after too many wrong keys ──────────────────────────
  var badKey = 'bad_' + minute;
  if (parseInt(cache.get(badKey) || '0', 10) >= BAD_KEY_LIMIT) {
    return json_({ error: 'Too many failed attempts. Try again later.' });
  }

  // ── Secret key check ─────────────────────────────────────────
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (!secret || !data.key || !safeEqual_(data.key, secret)) {
    cache.put(badKey, String(parseInt(cache.get(badKey) || '0', 10) + 1), 65);
    return json_({ error: 'Unauthorized.' });
  }

  // ── One lock for everything below ────────────────────────────
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (_) { return json_({ error: 'Server busy, try again.' }); }

  try {
    // Rate limit
    var rateKey = 'rate_' + minute;
    var count = parseInt(cache.get(rateKey) || '0', 10);
    if (count >= RATE_LIMIT) return json_({ error: 'Rate limit exceeded. Please try again later.' });
    cache.put(rateKey, String(count + 1), 65);

    // ── Routing ────────────────────────────────────────────────
    if (data.action === 'nfcSerials') return saveSerials_(data);   // NFC_Serial_Registrate
    if (data.action === 'nfcSave') return saveNfc_(data);   // NFC_Save
    if (data.action === 'pinSave') return savePin_(data);   // Pin_Save
    return json_({ error: 'Duplicate NFC ID. Reload to get the next free ID.' });

  } catch (err) {
    console.error(err);
    return json_({ error: 'Server error.' });
  } finally {
    lock.releaseLock();
  }
}

/** NEW – save serial numbers (+ content) to reg_list: one row per tag.
 *  Column A = serial number, column B = content.
 *  A serial that is already in the sheet is NOT added again: its content
 *  (column B) is updated instead. Called while the script lock is held. */
function saveSerials_(data) {
  var rows = data.rows;
  if (!Array.isArray(rows) || rows.length === 0) return json_({ error: 'Input validation failed: rows' });
  if (rows.length > MAX_REG_ROWS)               return json_({ error: 'Too many rows (max ' + MAX_REG_ROWS + ').' });

  // Validate + de-duplicate inside the request
  var clean = [], seen = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    var serial  = text_(r.serialNum).toUpperCase();
    var content = text_(r.nfcData);
    if (!SERIAL_REQ_RE.test(serial))             return json_({ error: 'Input validation failed: serialNum (row ' + (i + 1) + ')' });
    if (content.length > 1000)                   return json_({ error: 'Input validation failed: nfcData (row ' + (i + 1) + ')' });
    if (HTML_RE.test(content))                   return json_({ error: 'Input validation failed: html (row ' + (i + 1) + ')' });
    if (CTRL_RE.test(content))                   return json_({ error: 'Input validation failed: control characters (row ' + (i + 1) + ')' });
    var n = normSerial_(serial);
    if (seen[n] !== undefined) { clean[seen[n]].content = content; continue; }   // last one wins
    seen[n] = clean.length;
    clean.push({ serial: serial, content: content, norm: n });
  }

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_REG);
  if (!sheet) return json_({ error: 'Server error.' });

  // Index existing serials (column A) -> row number
  var last = sheet.getLastRow();
  var index = {};
  if (last >= 1) {
    var colA = sheet.getRange(1, 1, last, 1).getValues();
    for (var k = 0; k < colA.length; k++) {
      var s = normSerial_(colA[k][0]);
      if (s) index[s] = k + 1;
    }
  }

  var toAdd = [], updated = 0;
  clean.forEach(function (c) {
    if (index[c.norm]) {                                  // already registered -> update content
      sheet.getRange(index[c.norm], 2).setNumberFormat('@').setValue(c.content);
      updated++;
    } else {
      toAdd.push([c.serial, c.content]);
    }
  });

  if (toAdd.length) {
    var start = sheet.getLastRow() + 1;
    // Plain-text format: serials like "1E05..." must never become numbers/dates,
    // and a value like "=IMPORTDATA(...)" is stored literally, never evaluated.
    sheet.getRange(start, 1, toAdd.length, 2).setNumberFormat('@').setValues(toAdd);
  }
  return json_({ status: 'success', added: toAdd.length, updated: updated });
}

/** NFC Save – save one NFC record to nfc_list. */
function saveNfc_(data) {
  var nfcId      = text_(data.nfcId);
  var plantId    = text_(data.plantId);
  var nfcTyp     = text_(data.nfcTyp);
  var datum      = text_(data.datum);
  var nfcCreated = text_(data.nfcCreated);
  var nfcPos     = text_(data.nfcPos);
  var nfcData    = text_(data.nfcData);
  var other      = text_(data.other);
  var serialNum  = text_(data.serialNum);
  var comment    = text_(data.comment);

  var bad = null;
  if (!/^\d{1,9}$/.test(nfcId))                           bad = 'nfcId';
  else if (plantId !== '' && !/^\d{1,9}$/.test(plantId))  bad = 'plantId';
  else if (!/^[nopvmg]$/.test(nfcTyp))                    bad = 'nfcTyp';   // 'g' (mushroom) added
  else if (!DATE_RE.test(datum))                          bad = 'datum';
  else if (!DATE_RE.test(nfcCreated))                     bad = 'nfcCreated';
  else if (nfcPos !== '' && !GPS_RE.test(nfcPos))         bad = 'nfcPos';
  else if (nfcData.length === 0 || nfcData.length > 1000) bad = 'nfcData';
  else if (other.length > 300)                            bad = 'other';
  else if (comment.length > 300)                          bad = 'comment';
  else if (!SERIAL_RE.test(serialNum))                    bad = 'serialNum';
  else if (HTML_RE.test(nfcData) || HTML_RE.test(other) || HTML_RE.test(comment)) bad = 'html';
  else if (CTRL_RE.test(nfcData + other + comment))       bad = 'control characters';
  if (bad) return json_({ error: 'Input validation failed: ' + bad });

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_NFC);

  // Reject duplicate NFC ids
  var existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < existing.length; i++) {
    if (Number(existing[i][0]) === Number(nfcId)) {
      return json_({ error: 'Duplicate NFC ID. Reload to get the next free ID.' });
    }
  }

  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2, 1, 9).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 10).setValues([[
    Number(nfcId), plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, serialNum, comment
  ]]);
  return json_({ status: 'success' });
}

/** Pin Save – save one Pin record to pin_list. */
function savePin_(data) {
  var pinId = 1;
  var plantId    = text_(data.plantId);
  var nfcTyp     = text_(data.nfcTyp);
  var datum      = text_(data.datum);
  var nfcCreated = text_(data.nfcCreated);
  var nfcPos     = text_(data.nfcPos);
  var nfcData    = text_(data.nfcData);
  var other      = text_(data.other);
  var serialNum  = text_(data.serialNum);
  var comment    = text_(data.comment);

  var bad = null;
  if (plantId !== '' && !/^\d{1,9}$/.test(plantId))  bad = 'plantId';
  else if (!/^[nopvmg]$/.test(nfcTyp))                    bad = 'nfcTyp';   // 'g' (mushroom) added
  else if (!DATE_RE.test(datum))                          bad = 'datum';
  else if (!DATE_RE.test(nfcCreated))                     bad = 'nfcCreated';
  else if (nfcPos !== '' && !GPS_RE.test(nfcPos))         bad = 'nfcPos';
  else if (nfcData.length === 0 || nfcData.length > 1000) bad = 'nfcData';
  else if (other.length > 300)                            bad = 'other';
  else if (comment.length > 300)                          bad = 'comment';
  else if (HTML_RE.test(nfcData) || HTML_RE.test(other) || HTML_RE.test(comment)) bad = 'html';
  else if (CTRL_RE.test(nfcData + other + comment))       bad = 'control characters';
  if (bad) return json_({ error: 'Input validation failed: ' + bad });

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_PIN);

  // Make pinId from last ids
  try {
    pinId = Number(maxNfcId_(sheet))+1;
  } catch (err) {
    console.error(err);
    return json_({ error: 'Server error.' });
  }

  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2, 1, 9).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 10).setValues([[
    Number(pinId), plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, comment
  ]]);
  return json_({ status: 'success' });
}
