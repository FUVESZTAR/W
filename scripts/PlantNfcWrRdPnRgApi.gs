// =============================================================
// Google Apps Script Web App – NFC list writer (hardened)
// Actions (POST): nfcSave -> nfc_list | pinSave -> pin_list | nfcSerials -> reg_list
// GET: ?            -> {lastId} of nfc_list
//      ?action=pinLastId -> {lastId} of pin_list
// =============================================================
// DEPLOY:
//  1. script.google.com > new project > paste this file.
//  2. Project Settings > Script Properties > add  SECRET_KEY = <long random value>
//     (openssl rand -hex 24). Put the same value into CFG.SECRET of the web page.
//  3. Deploy > New deployment > Web app. Execute as: Me. Access: "Anyone".
//  4. After EVERY edit: Deploy > Manage deployments > Edit > New version.
// NOTE: the key in the web page is visible to anyone, so it is only a spam
// filter. The real protection is the validation, locking and rate limits below.
// SHEETS: row 1 of nfc_list / pin_list / reg_list must be a header row
//         (ids are read from row 2 down).
// =============================================================

var SPREADSHEET_ID = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
var SHEET_NAME_NFC = 'nfc_list';
var SHEET_NAME_PIN = 'pin_list';
var SHEET_NAME_REG = 'reg_list';   
// listing no. (A) | serial (B) | content (C) | date (D)
var RATE_LIMIT     = 20;           // max POST requests per minute (all clients together)
var BAD_KEY_LIMIT  = 5;            // max wrong-key attempts per minute, then block everything
var MAX_REG_ROWS   = 200;          // max tags per request

// nfc_list columns: nfcId, plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, other, serialNum, comment
// pin_list columns: pinId, plantId, nfcTyp, datum, created, nfcPos, other, comment
var DATE_RE   = /^\d{4}-\d{2}-\d{2}$/;
var HTML_RE   = /<[^>]*>/;
var CTRL_RE   = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;   // control chars (tab/newline allowed)
var GPS_RE    = /^L\|[A-Za-z0-9+\/=]{16,24}\|L$/;
var SERIAL_RE = /^[0-9A-Fa-f:\-]{0,40}$/;
var SERIAL_REQ_RE = /^[0-9A-Fa-f:\-]{1,40}$/;   // serial required (reg_list)
//var SERIAL_REQ_RE = /^[0-9A-F]{2}(?::[0-9A-F]{2}){6}$/i;  //AI

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

/** GET – last id of nfc_list (default) or pin_list (?action=pinLastId), so the client can pre-fill the next one. */
function doGet(e) {
  try {
    var name = (e && e.parameter && e.parameter.action === 'pinLastId') ? SHEET_NAME_PIN : SHEET_NAME_NFC;
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
    return json_({ lastId: String(maxNfcId_(sheet)) });
  } catch (err) { console.error(err); return json_({ error: 'Server error.' }); }
}

/** POST – auth, rate limit, lock, then route by data.action. */
function doPost(e) {
  var cache = CacheService.getScriptCache();
  var minute = Math.floor(Date.now() / 60000);

  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (_) { return json_({ error: 'Invalid request format.' }); }
  if (!data || typeof data !== 'object') return json_({ error: 'Invalid request format.' });

  // Block after too many wrong keys
  var badKey = 'bad_' + minute;
  if (parseInt(cache.get(badKey) || '0', 10) >= BAD_KEY_LIMIT) {
    return json_({ error: 'Too many failed attempts. Try again later.' });
  }

  // Secret key check
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (!secret || !data.key || !safeEqual_(data.key, secret)) {
    cache.put(badKey, String(parseInt(cache.get(badKey) || '0', 10) + 1), 65);
    return json_({ error: 'Unauthorized.' });
  }

  // One lock for everything below
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (_) { return json_({ error: 'Server busy, try again.' }); }

  try {
    var rateKey = 'rate_' + minute;
    var count = parseInt(cache.get(rateKey) || '0', 10);
    if (count >= RATE_LIMIT) return json_({ error: 'Rate limit exceeded. Please try again later.' });
    cache.put(rateKey, String(count + 1), 65);

    if (data.action === 'nfcSerials') return saveSerials_(data);   // registry
    if (data.action === 'nfcSave')    return saveNfc_(data);       // NFC generator
    if (data.action === 'pinSave')    return savePin_(data);       // Location saver
    return json_({ error: 'Unknown action.' });                    // was: "Duplicate NFC ID" (wrong message)

  } catch (err) {
    console.error(err);
    return json_({ error: 'Server error.'+ err.message  });
  } finally {
    lock.releaseLock();
  }
}


/**
 * Find an existing NFC serial in reg_list.
 *
 * Searches column B, starting at row 2 (row 1 = headers).
 *
 * Returns:
 *   Existing row number, e.g. 5
 *   0 if the serial does not exist.
 *
 * serialValues is optional:
 *   If supplied, it uses the already-read column B values.
 *   This avoids repeatedly reading the sheet in saveSerials_().
 */
function findSerialRow_(sheet, serialNum, serialValues) {

  var target = String(serialNum == null ? '' : serialNum)
    .trim()
    .toUpperCase();

  if (!target) return 0;

  var last = sheet.getLastRow();
  if (last < 2) return 0;

  // Read column B if values were not supplied.
  if (!serialValues) {
    serialValues = sheet.getRange(2, 2, last - 1, 1).getDisplayValues();
  }

  for (var i = 0; i < serialValues.length; i++) {

    var existing = String(
      serialValues[i][0] == null ? '' : serialValues[i][0]
    ).trim().toUpperCase();

    if (existing === target) {
      return i + 2; // Actual spreadsheet row number.
    }
  }

  return 0;
}

/** Save serial numbers (+ content) to reg_list, one row per tag.
 *  const rgSave = rows => sendToServer({ key: CFG.SECRET, action: 'nfcSerials', rows: rows.map(r => ({ serialNum: r.serial, nfcStatus: r.tagStatus, location: r.locationSave, nfcPos: r.gps, nfcData: r.content})) });
 *  Columns: A = listing number | B = serial  | C = date of last update | D = nfc status | E = location | F = nfcPos | G = content
 *  A known serial is NOT added again: its C = date of last update | D = nfc status | E = location | F = nfcPos | G = content are updated.
 *  Called while the script lock is held. 
 *  in json to sheet:  toAdd.push([maxNr, c.serial, dateN, c.nfcSt, c.location, c.nfcPos, c.content]
 * */
function saveSerials_(data) {

  var rows = data.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return json_({ error: 'Input validation failed: rows' });
  }

  if (rows.length > MAX_REG_ROWS) {
    return json_({ error: 'Too many rows (max ' + MAX_REG_ROWS + ').' });
  }

  var dateN = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );

  // Validate and de-duplicate incoming serials.
  var clean = [];
  var seen = {};

  for (var i = 0; i < rows.length; i++) {

    var r = rows[i] || {};

    var serial = text_(r.serialNum).trim().toUpperCase();
    var content = text_(r.nfcData);
    var nfcSt = text_(r.nfcStatus).toLowerCase();
    var nfcPos = text_(r.nfcPos);
    var location = text_(r.location);

    if (!SERIAL_REQ_RE.test(serial)) {
      return json_({ error: 'Input validation failed: serialNum (row ' + (i + 1) + ')' });
    }
   //var SERIAL_REQ_RE = /^[0-9A-F]{2}(?::[0-9A-F]{2}){6}$/i;
    if (content.length > 1000 || HTML_RE.test(content) || CTRL_RE.test(content)) {
      return json_({ error: 'Input validation failed: nfcData (row ' + (i + 1) + ')' });
    }

    if (location.length > 1000 || HTML_RE.test(location) || CTRL_RE.test(location)) {
      return json_({ error: 'Input validation failed: location (row ' + (i + 1) + ')' });
    }

    if (nfcPos.length > 1000 || HTML_RE.test(nfcPos) || CTRL_RE.test(nfcPos)) {
      return json_({ error: 'Input validation failed: nfcPos (row ' + (i + 1) + ')' });
    }

    if (nfcSt !== 'active' && nfcSt !== 'inactive') {
      return json_({ error: 'Input validation failed: nfcStatus (row ' + (i + 1) + ')' });
    }

    // Colons remain part of the serial.
    var n = serial;

    // Last occurrence wins inside the request.
    if (seen[n] !== undefined) {
      clean[seen[n]].content = content;
      clean[seen[n]].nfcSt = nfcSt;
      clean[seen[n]].location = location;
      clean[seen[n]].nfcPos = nfcPos;
      continue;
    }

    seen[n] = clean.length;

    clean.push({
      serial: serial,
      content: content,
      norm: n,
      nfcSt: nfcSt,
      location: location,
      nfcPos: nfcPos
    });
  }

  var sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_NAME_REG);

  if (!sheet) {
    return json_({ error: 'Server error.' });
  }

  // Read existing rows once.
  var last = sheet.getLastRow();
  var colAB = last >= 2
    ? sheet.getRange(2, 1, last - 1, 2).getDisplayValues()
    : [];

  // Extract existing serials for findSerialRow_().
  var serialValues = colAB.map(function (r) {
    return [r[1]];
  });

  // Find highest listing number.
  var maxNr = 0;

  for (var k = 0; k < colAB.length; k++) {
    var nr = Number(colAB[k][0]);

    if (colAB[k][0] !== '' && isFinite(nr) && nr > maxNr) {
      maxNr = nr;
    }
  }

  var toAdd = [];
  var updated = 0;

  clean.forEach(function (c) {

    // Shared lookup function.
    var row = findSerialRow_(sheet, c.serial, serialValues);

    if (row > 0) {

      // Existing serial: update C-G.
      var cols = [
        [3, dateN],
        [4, c.nfcSt],
        [5, c.location],
        [6, c.nfcPos],
        [7, c.content]
      ];

      cols.forEach(function (p) {
        if (text_(p[1]) !== '') {
          sheet.getRange(row, p[0])
            .setNumberFormat('@')
            .setValue(p[1]);
        }
      });

      updated++;

    } else {

      // New serial: add a new row.
      maxNr++;

      toAdd.push([
        maxNr,
        c.serial,
        dateN,
        c.nfcSt,
        c.location,
        c.nfcPos,
        c.content
      ]);
    }
  });

  // Write all new rows together.
  if (toAdd.length > 0) {

    var start = sheet.getLastRow() + 1;

    sheet.getRange(start, 2, toAdd.length, 6)
      .setNumberFormat('@');

    sheet.getRange(start, 1, toAdd.length, 7)
      .setValues(toAdd);
  }

  return json_({
    status: 'success',
    added: toAdd.length,
    updated: updated
  });
}


/** Append one row to 
 *  Called from saveNfc_() while the script lock is held, so the running number cannot be taken twice.
 *  Returns true if a row was written, false if skipped or failed (the NFC save itself is not affected). */
function saveSerialsAfterNfcSave_(nfcData, serialNum, location, nfcPos) {
  serialNum = text_(serialNum).trim().toUpperCase();
  if (!serialNum) return false;

  try {

    var sheet = SpreadsheetApp
      .openById(SPREADSHEET_ID)
      .getSheetByName(SHEET_NAME_REG);

    if (!sheet) {
      console.error('Sheet not found: ' + SHEET_NAME_REG);
      return false;
    }

    var nfcSt = 'active';

    var dateN = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );

    // Shared lookup function.
    // Returns existing row number or 0.
    var existingRow = findSerialRow_(sheet, serialNum);

    if (existingRow > 0) {

      // Serial already exists: update C-G.
      var values = [
        dateN,
        nfcSt,
        text_(location),
        text_(nfcPos),
        text_(nfcData)
      ];

      // Always update date.
      sheet.getRange(existingRow, 3)
        .setNumberFormat('@')
        .setValue(dateN);

      // Update the other fields only when non-empty.
      for (var i = 1; i < values.length; i++) {

        if (values[i] !== '') {
          sheet.getRange(existingRow, i + 3)
            .setNumberFormat('@')
            .setValue(values[i]);
        }
      }

      console.log('Updated existing NFC serial: ' + serialNum);

      return true;

    } else {

      // Serial does not exist: create a new row.
      var nr = maxNfcId_(sheet) + 1;
      var newRow = sheet.getLastRow() + 1;

      sheet.getRange(newRow, 2, 1, 6)
        .setNumberFormat('@');

      sheet.getRange(newRow, 1, 1, 7).setValues([[
        nr,
        serialNum,
        dateN,
        nfcSt,
        text_(location),
        text_(nfcPos),
        text_(nfcData)
      ]]);

      console.log('Added new NFC serial: ' + serialNum);

      return true;
    }

  } catch (err) {

    console.error('saveSerialsAfterNfcSave_ error: ' + err);

    return false;
  }
}


/** NFC Save – one record to nfc_list. */
/**  const payload = { key: CFG.SECRET, action: 'nfcSave', nfcId: F.nfcId.value, plantId: F.plantId.value,*/
/**                    nfcTyp: F.type.value, datum: F.date.value, nfcCreated: today, nfcPos: nfcPos, nfcData: el('nfc-preview').textContent, other: F.other.value,*/
/**                    serialNum: isPh(serial, 'ph_serialnr_preview') ? '' : serial,comment: MENT.comment.value, MENT.location.value }; */
/**  in sheet: setValues([[Number(nfcId), plantId, serialNum, nfcTyp, datum, nfcCreated, nfcData, location, nfcPos, other, comment]])     */
function saveNfc_(data) {
  var nfcId      = text_(data.nfcId);
  var plantId    = text_(data.plantId);
  var nfcTyp     = text_(data.nfcTyp);
  var datum      = text_(data.datum);
  var nfcCreated = text_(data.nfcCreated);
  var nfcPos     = text_(data.nfcPos);
  var nfcData    = text_(data.nfcData);
  var other      = text_(data.other);
  var serialNum  = text_(data.serialNum).trim().toUpperCase();
  var comment    = text_(data.comment);
  var location   = text_(data.location);

  var bad = null;
  if (!/^\d{1,9}$/.test(nfcId))                           bad = 'nfcId';
  else if (plantId !== '' && !/^\d{1,9}$/.test(plantId))  bad = 'plantId';
  else if (!/^[nopvmg]$/.test(nfcTyp))                    bad = 'nfcTyp';
  else if (!DATE_RE.test(datum))                          bad = 'datum';
  else if (!DATE_RE.test(nfcCreated))                     bad = 'nfcCreated';
  else if (nfcPos !== '' && !GPS_RE.test(nfcPos))               bad = 'nfcPos';
  else if (nfcData.length === 0 || nfcData.length > 1000) bad = 'nfcData';
  else if (other.length > 300)                            bad = 'other';
  else if (comment.length > 300)                          bad = 'comment';
  else if (location.length > 100)                         bad = 'location';
  else if (!SERIAL_RE.test(serialNum))                    bad = 'serialNum';
  else if (HTML_RE.test(nfcData) || HTML_RE.test(other) || HTML_RE.test(comment) || HTML_RE.test(location)) bad = 'html';
  else if (CTRL_RE.test(nfcData + other + comment + location))       bad = 'control characters';
  
  if (bad) return json_({ error: 'Input validation failed: ' + bad });

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_NFC);
  if (!sheet) return json_({ error: 'Server error.' });

  // Reject duplicate NFC ids
  var existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < existing.length; i++) {
    if (Number(existing[i][0]) === Number(nfcId)) {
      return json_({ error: 'Duplicate NFC ID. Reload to get the next free ID.' });
    }
  }

  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2, 1, 10).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 11).setValues([[Number(nfcId), plantId, serialNum, nfcTyp, datum, nfcCreated, nfcData, location, nfcPos, other, comment]]);
  //save finished then register
//nfcData; serialNum
  saveSerialsAfterNfcSave_(nfcData, serialNum, location, nfcPos);
  return json_({ status: 'success' });
}

/** Pin Save – one record to pin_list. The SERVER assigns the pin id (the client id is only a preview). */
/**  const payload = { key: CFG.SECRET, action: 'pinSave', plantId: F.plantId.value, nfcTyp: F.type.value, */
/**    datum: F.date.value, nfcCreated: today,  nfcData: el('nfc-preview').textContent, nfcPos: nfcPos, other: F.other.value, comment: MENT.comment.value } */
/**   in sheet: setValues([[pinId, plantId, nfcTyp, datum, created, nfcData, location, nfcPos, other, comment]]) */
function savePin_(data) {
  var plantId = text_(data.plantId), nfcTyp = text_(data.nfcTyp), datum = text_(data.datum),
      created = text_(data.nfcCreated), nfcPos = text_(data.nfcPos),
      other = text_(data.other), comment = text_(data.comment), location = text_(data.location), nfcData = text_(nfcData);
  var bad = null;
  if (plantId !== '' && !/^\d{1,9}$/.test(plantId))   bad = 'plantId';
  else if (!/^[nopvmg]$/.test(nfcTyp))                bad = 'nfcTyp';
  else if (!DATE_RE.test(datum))                      bad = 'datum';
  else if (!DATE_RE.test(created))                    bad = 'nfcCreated';
  else if (nfcPos !== '' && !GPS_RE.test(nfcPos))           bad = 'nfcPos';
  else if (nfcData.length === 0 || nfcData.length > 1000) bad = 'nfcData';
  else if (other.length > 300)                        bad = 'other';
  else if (comment.length > 300)                      bad = 'comment';
  else if (location.length > 300)                         bad = 'location';
  else if (HTML_RE.test(nfcData) || HTML_RE.test(other) || HTML_RE.test(comment) || HTML_RE.test(location)) bad = 'html';
  else if (CTRL_RE.test(nfcData + other + comment + location))             bad = 'control characters';
  if (bad) return json_({ error: 'Input validation failed: ' + bad });

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_PIN);
  if (!sheet) return json_({ error: 'Server error.' });
  var pinId = maxNfcId_(sheet) + 1;                       // safe: the script lock is held
  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2, 1, 9).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 10).setValues([[pinId, plantId, nfcTyp, datum, created, nfcData, location, nfcPos, other, comment]]);
  return json_({ status: 'success', pinId: pinId });
}
