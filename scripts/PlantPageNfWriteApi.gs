// =============================================================
// Google Apps Script Web App – NFC list writer (hardened)
// =============================================================
// DEPLOY:
//  1. script.google.com > new project > paste this file.
//  2. Project Settings > Script Properties > add  SECRET_KEY = <new long random value>
//     (generate with: openssl rand -hex 24). The old key is public: replace it.
//  3. Deploy > New deployment > Web app. Execute as: Me.
//     Who has access: "Anyone" (needed for a public page). If the users all have
//     Google accounts, "Anyone with Google account" is stronger.
//  4. After EVERY edit: Deploy > Manage deployments > Edit > New version.
//  5. Put the same SECRET_KEY into CFG.SECRET of nfc-app.js.
//
// NOTE: the key in the web page is visible to anyone, so it is only a spam
// filter. The real protection is the validation, locking and rate limits below.
// =============================================================

var SPREADSHEET_ID = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
var SHEET_NAME     = 'nfc_list';
var RATE_LIMIT     = 20;   // max POST requests per minute (all clients together)
var BAD_KEY_LIMIT  = 5;    // max wrong-key attempts per minute, then block everything

// Column order: nfcId, plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, serialNum
// (no link column: the server never receives or stores a link)
var DATE_RE   = /^\d{4}-\d{2}-\d{2}$/;
var HTML_RE   = /<[^>]*>/;
var CTRL_RE   = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;   // control chars (tab/newline allowed in notes only)
var GPS_RE    = /^L\|[A-Za-z0-9+\/=]{16,24}\|L$/;
var SERIAL_RE = /^[0-9A-Fa-f:\-]{0,40}$/;

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

/** Spreadsheet formula-injection guard: stored as plain text, never as a formula. */
function text_(v) { return String(v == null ? '' : v).trim(); }

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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    return json_({ lastId: String(maxNfcId_(sheet)) });
  } catch (err) {
    console.error(err);
    return json_({ error: 'Server error.' });          // no internal details to the client
  }
}

/** POST – validate, lock, check duplicates, append. */
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

  // ── Secret key check (key must exist AND match) ──────────────
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (!secret || !data.key || !safeEqual_(data.key, secret)) {
    cache.put(badKey, String(parseInt(cache.get(badKey) || '0', 10) + 1), 65);
    return json_({ error: 'Unauthorized.' });
  }

  // ── Everything below runs under one lock: rate limit, duplicate
  //    check and append are atomic (no two users get the same id) ──
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (_) { return json_({ error: 'Server busy, try again.' }); }

  try {
    // Rate limit
    var rateKey = 'rate_' + minute;
    var count = parseInt(cache.get(rateKey) || '0', 10);
    if (count >= RATE_LIMIT) return json_({ error: 'Rate limit exceeded. Please try again later.' });
    cache.put(rateKey, String(count + 1), 65);

    // Read fields (only these; anything else in the body is ignored)
    var nfcId      = text_(data.nfcId);
    var plantId    = text_(data.plantId);
    var nfcTyp     = text_(data.nfcTyp);
    var datum      = text_(data.datum);
    var nfcCreated = text_(data.nfcCreated);
    var nfcPos     = text_(data.nfcPos);
    var nfcData    = text_(data.nfcData);
    var other      = text_(data.other);
    var serialNum  = text_(data.serialNum);

    // Strict, field-specific validation
    var bad = null;
    if (!/^\d{1,9}$/.test(nfcId))                         bad = 'nfcId';
    else if (plantId !== '' && !/^\d{1,9}$/.test(plantId)) bad = 'plantId';
    else if (!/^[nopvm]$/.test(nfcTyp))                   bad = 'nfcTyp';
    else if (!DATE_RE.test(datum))                        bad = 'datum';
    else if (!DATE_RE.test(nfcCreated))                   bad = 'nfcCreated';
    else if (nfcPos !== '' && !GPS_RE.test(nfcPos))       bad = 'nfcPos';
    else if (nfcData.length === 0 || nfcData.length > 1000) bad = 'nfcData';
    else if (other.length > 300)                          bad = 'other';
    else if (!SERIAL_RE.test(serialNum))                  bad = 'serialNum';
    else if (HTML_RE.test(nfcData) || HTML_RE.test(other)) bad = 'html';
    else if (CTRL_RE.test(nfcData + other))        bad = 'control characters';
    if (bad) return json_({ error: 'Input validation failed: ' + bad });

    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    // Reject duplicate NFC ids (client refetches the next id and retries)
    var existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < existing.length; i++) {
      if (Number(existing[i][0]) === Number(nfcId)) {
        return json_({ error: 'Duplicate NFC ID. Reload to get the next free ID.' });
      }
    }

    // Write: id as a number, every other column forced to plain TEXT format so
    // a value like "=IMPORTDATA(...)" is stored literally, never evaluated.
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 2, 1, 8).setNumberFormat('@');
    sheet.getRange(row, 1, 1, 9).setValues([[
      Number(nfcId), plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, serialNum
    ]]);
    return json_({ status: 'success' });

  } catch (err) {
    console.error(err);                                  // details only in the Apps Script log
    return json_({ error: 'Server error.' });
  } finally {
    lock.releaseLock();
  }
}
