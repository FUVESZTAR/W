// =============================================================
// Google Apps Script Web App – Google Drive Image API
// =============================================================
// HOW TO DEPLOY:
//  1. Open https://script.google.com and create a new project.
//  2. Paste this entire file into the editor.
//  3. paste the Folder Name
// =============================================================

const FOLDER_ID = '1C3hue-BEja_cumoATlSqe4UZsBLM7dnC';  // 'YOUR_FOLDER_ID'

// ------------------------------------------------------------
// GET request
//
// Example:
// https://script.google.com/macros/s/XXXX/exec?search=malus_domestica_gala
// ------------------------------------------------------------

function doGet(e) {

  const search = (e.parameter.search || '').trim();

  if (!search) {
    return jsonResponse({
      success: false,
      error: 'Missing search parameter'
    });
  }

  try {

    const results = findImages(search);

    return jsonResponse({
      success: true,
      count: results.length,
      images: results
    });

  } catch (error) {

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}


// ------------------------------------------------------------
// Search Drive folder
// ------------------------------------------------------------

function findImages(search) {

  const folder = DriveApp.getFolderById(FOLDER_ID);

  const files = folder.getFiles();

  const searchNormalized = normalizeName(search);

  const results = [];


  while (files.hasNext()) {

    const file = files.next();

    const mimeType = file.getMimeType();

    // Only images
    if (!mimeType.startsWith('image/')) {
      continue;
    }


    const fileName = file.getName();

    const normalizedFileName =
      normalizeName(fileName);


    // Match filename
    if (normalizedFileName.includes(searchNormalized)) {

      const fileId = file.getId();

      results.push({

        id: fileId,

        name: fileName,

        mimeType: mimeType,

        url:
          'https://drive.google.com/thumbnail?id=' +
          fileId +
          '&sz=w1000'

      });
    }
  }


  // Sort alphabetically
  results.sort(function(a, b) {

    return a.name.localeCompare(b.name);

  });


  return results;
}


// ------------------------------------------------------------
// Normalize names
//
// Converts:
// "Malus domestica Gala 1.jpg"
//
// into something similar to:
// "malus_domestica_gala_1"
// ------------------------------------------------------------

function normalizeName(value) {

  return String(value || '')
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

}


// ------------------------------------------------------------
// JSON response
// ------------------------------------------------------------

function jsonResponse(data) {

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

}

function test() { Logger.log(findImages('malus_domestica')); }
