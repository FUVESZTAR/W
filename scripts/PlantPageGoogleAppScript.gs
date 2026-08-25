// =============================================================
// Google Apps Script Web App – NFC list writer
// =============================================================
// HOW TO DEPLOY:
//  1. Open https://script.google.com and create a new project.
//  2. Paste this entire file into the editor.
//  3. Go to Project Settings > Script Properties and add:
//       SECRET_KEY  =  <a long random string you invent>
//  4. Click "Deploy > New deployment", choose type "Web app".
//     Execute as: Me
//     Who has access: Anyone
//  5. Copy the Web App URL and paste it into nfcgen.js as
//     SHEET_WRITER_URL.  Also copy your SECRET_KEY there as
//     SHEET_WRITER_SECRET.
// =============================================================

var SPREADSHEET_ID = '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE';
var SHEET_NAME     = 'nfc_list';
var RATE_LIMIT     = 20;   // max POST requests per 60-second window (global)

/**
 * GET handler – returns the last value from column A so the client
 * can pre-fill the NFC ID field.
 */
function doGet() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    var lastRow = sheet.getLastRow();
    var lastId  = (lastRow > 1) ? sheet.getRange(lastRow, 1).getValue() : '';
    return ContentService
      .createTextOutput(JSON.stringify({ lastId: String(lastId) }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST handler – validates the request and appends a new row.
 * Expects JSON body: { key, nfcId, nfcData, link }
 * Send with Content-Type: text/plain to avoid a CORS preflight.
 */
function doPost(e) {
  // ── Rate limiting ────────────────────────────────────────────
  var cache     = CacheService.getScriptCache();
  var bucketKey = 'rate_' + Math.floor(Date.now() / 60000);
  var count     = parseInt(cache.get(bucketKey) || '0', 10);
  if (count >= RATE_LIMIT) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  cache.put(bucketKey, String(count + 1), 65); // expire after 65 s

  // ── Parse body ───────────────────────────────────────────────
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (_) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid request format.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Secret key check ─────────────────────────────────────────
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (!data.key || data.key !== secret) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Input validation ─────────────────────────────────────────
  var MAX_DATA = 1000;
  var MAX_ID   = 50;
  var nfcId   = String(data.nfcId   || '').trim();
  var plantId   = String(data.plantId   || '').trim();
  var nfcTyp   = String(data.nfcTyp   || '').trim();
  var datum   = String(data.datum   || '').trim();
  var nfcCreated   = String(data.nfcCreated   || '').trim();
  var nfcPos   = String(data.nfcPos   || '').trim();
  var nfcData = String(data.nfcData || '').trim();
  var link    = String(data.link    || '').trim();
  var other   = String(data.other   || '').trim();
  var serialNum   = String(data.serialNum   || '').trim();
  

  if (nfcData.length === 0 || nfcData.length > MAX_DATA ||
      nfcId.length > MAX_ID || link.length > MAX_DATA|| 
      plantId.length > MAX_DATA|| nfcTyp.length > MAX_DATA|| 
      datum.length > MAX_DATA|| nfcCreated.length > MAX_DATA ||
      nfcPos.length > MAX_DATA || other.length > MAX_DATA|| serialNum.length > MAX_DATA) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Input validation failed.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Reject HTML / script injection and dangerous URL schemes
  var htmlTag = /<[^>]*>/;
  var jsProto = /javascript\s*:/i;
  if (htmlTag.test(nfcId) || htmlTag.test(nfcData) || htmlTag.test(link) ||
      htmlTag.test(plantId) || htmlTag.test(nfcTyp) || htmlTag.test(datum) ||
      htmlTag.test(nfcCreated) || htmlTag.test(nfcPos) || htmlTag.test(other) ||
      htmlTag.test(serialNum) ||jsProto.test(link)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid characters in input.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Append row ───────────────────────────────────────────────
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    sheet.appendRow([nfcId, plantId, nfcTyp, datum, nfcCreated, nfcPos, nfcData, link, other,serialNum]);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
