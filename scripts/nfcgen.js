//import { loadActiveNFCPlants } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from './lang.js';
import { TRANSLATIONS } from './i18n.js';

// ── Google Apps Script Web App configuration ─────────────────────────────────
// Deploy scripts/sheetwriter.js as a Google Apps Script Web App and paste the
// resulting URL below.  Also set the same SECRET_KEY in Script Properties.
// See scripts/sheetwriter.js for full deployment instructions.
//
// Security note: SHEET_WRITER_SECRET is visible in page source.  It provides
// write-only authorization (no data can be read via this key) and is combined
// with rate limiting and input validation in the Apps Script to prevent abuse.
// Keep the SECRET_KEY long and random; treat the Web App URL as semi-private.
const SHEET_WRITER_URL    = 'https://script.google.com/macros/s/AKfycbysWB68AM6TKlobnA3MLR_18LpJjGVkHolPf3G_WNziV3r93_fztJIenTVSoll-Kmtp/exec';
const SHEET_WRITER_SECRET = '159753g9d5rt4Ht4eg7e5z4d6szo89fsef';

const READ_SHEET_ID = '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY';
const READ_SHEET_NAME = 'plant_list';

/**
 * Fetch raw Google Visualization API response with an optional TQ query.
 */
async function fetchSheetResponseQR(tq = '') {
  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: READ_SHEET_NAME,
    ...(tq && { tq }),
  });
  const url = `https://docs.google.com/spreadsheets/d/${READ_SHEET_ID}/gviz/tq?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) {
    throw new Error('Unexpected Google Sheets API response format');
  }
  return JSON.parse(match[1]);
}
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
  console.log("Loading from datasource");
  const gvizResponse = await fetchSheetResponseQR(tq);
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
 * Load Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN
 * for all rows where Active_in_NFC = "Y".
 * Minimal traffic: only 5 columns, only active rows.
 *
 * @returns {Object[]} Array of plant objects with the selected fields.
 */
// ─────────────────────────────────────────────────────────────────────────────

/** Use the page-level i18n helper if available, otherwise return the key. */
function msg(key) {
  return t('nfcgen.' + key);
}

/** Placeholder text in either language – used to detect "no real data yet" */
const NFC_PLACEHOLDER_KEYS = ['ph_nfc_preview', 'ph_link_preview'];
function isPlaceholder(text) {
  return !text || NFC_PLACEHOLDER_KEYS.some(k => {
    return ['en','hu'].some(lang => {
      const translations = TRANSLATIONS[lang];
      return translations && translations['nfcgen.' + k] === text;
    });
  }) || text === 'NFC data will appear here...' || text === 'NFC data will appear here…';
}

let plantData = [];
let selectedPlantIndex = null;
let selectedVarietyData = null;
let customVarietyMode = false;
let plantId = 1;
let nfcIdValue =0;
let gpsPacket =null;
let updateNFCPreviewFn = null;
const nfcIdInput = document.getElementById("nfcId");
const gpsStartBtn = document.getElementById('gpsStartBtn');
const gpsStopBtn = document.getElementById('gpsStopBtn');
const liveDot = document.getElementById('liveDot');
const gpsDispLat = document.getElementById('gpsDispLat');
const gpsDispLon = document.getElementById('gpsDispLon');
const gpsDispAlt = document.getElementById('gpsDispAlt');
const gpsDispAcc = document.getElementById('gpsDispAcc');
const updateTimer = document.getElementById('updateTimer');
const posPacketOut = document.getElementById('posPacketOut');
const posPacketSize = document.getElementById('posPacketSize');                
const gpsStatus = document.getElementById('gpsStatus');
const gpsCardToggle = document.getElementById('gps_card_toggle');
const gpsCardBody = document.getElementById('gps_card_body');
const othCardToggle = document.getElementById('oth_card_toggle');
const othCardBody = document.getElementById('oth_card_body');
const serialNumText = document.getElementById("serialNr");
//gps
        let currentData = { lat: 0, lon: 0, alt: 0 , acc: 0 };
        let lastUpdateTime = Date.now();
        let timerInterval;
        let watchId = null;

        function setStatus(msg_text, color, statusItem) {
            const s = statusItem;
            s.textContent = msg_text;
            s.style.background = color;
            s.style.color = "white";
        }
/**
 * Fetches the last value from column A of the NFC list sheet via the
 * Apps Script Web App and pre-fills the NFC ID input.
 */
async function loadLastNfcId(nfcIdInput, onLoaded) {
  if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') return;
  try {
    const response = await fetch(SHEET_WRITER_URL, { redirect: 'follow' });
    const result   = await response.json();
    if (result.lastId !== undefined && result.lastId !== '') {
        const nextId = Number(result.lastId) + 1;
        nfcIdInput.value = nextId;
        nfcIdValue = nextId;
        if (nextId > 0 && typeof onLoaded === 'function') onLoaded();
    }
  } catch (err) {
    console.warn('Could not load last NFC ID:', err.message);
  }
}

/**
 * Attaches a live-search filter to a <select> element using a paired search
 * input (identified by `searchInputId`).  The full option list is snapshotted
 * whenever `refresh()` is called, and the select is rebuilt on every keystroke
 * so the native browser dropdown only shows matching entries.
 *
 * @param {HTMLSelectElement} selectEl   The <select> to make searchable.
 * @param {string}            searchId   The id of the companion <input> search field.
 * @returns {{ refresh: Function }}      Call refresh() after repopulating the select.
 */
function makeSelectSearchable(selectEl, searchId) {
  const searchInput = document.getElementById(searchId);
  if (!searchInput) return { refresh: () => {} };

  let allOptions = [];

  function snapshot() {
    allOptions = Array.from(selectEl.options).map(o => ({
      value: o.value,
      text:  o.textContent,
      selected: o.selected,
    }));
  }

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    const currentValue = selectEl.value;

    // Rebuild options: always keep the first (placeholder) option
    selectEl.innerHTML = '';
    allOptions.forEach(o => {
      if (o.value === '' || !query || o.text.toLowerCase().includes(query)) {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        selectEl.appendChild(opt);
      }
    });

    // Restore previous selection when it is still visible
    if (currentValue && Array.from(selectEl.options).some(o => o.value === currentValue)) {
      selectEl.value = currentValue;
    }
  }

  searchInput.addEventListener('input', applyFilter);

  // Clear search field when user makes a selection
  selectEl.addEventListener('change', () => {
    searchInput.value = '';
    // Re-snapshot so allOptions reflects current set (important for variety select)
    snapshot();
    applyFilter();
  });

  return {
    refresh() {
      snapshot();
      searchInput.value = '';
      applyFilter();
    },
  };
}

async function populate() {
  const selector = document.getElementById("plant-selector");
  const plantIdInput = document.getElementById("plantId");
  const datumInput = document.getElementById("datum");
  let plantNameInput = "";
  const nameVarietySelector = document.getElementById("name-variety");
  const nameVarietyCustomInput = document.getElementById("name-variety-custom");
  const latinNameInput = document.getElementById("latin-name");
  const nfcTypInput = document.getElementById("nfcTyp");
  const egyebInput = document.getElementById("egyeb");
  const nfcPreview = document.getElementById("nfc-preview");
  const nfcSize = document.getElementById("nfc-size");

  // Use language-aware name property
  const currentLang = getCurrentLang();
  const nameProp = currentLang === 'en' ? 'Name_EN' : 'Name_HU';
  const linkPreview = document.getElementById("link-preview");
  const linkSize = document.getElementById("link-size");
  const totalSize = document.getElementById("total-size");
  const gennfcBtn = document.getElementById("generate-nfc");
  const qrnfcBtn = document.getElementById("qr-button");
  const copynfcBtn = document.getElementById("copy-nfc");
  const copylinkBtn = document.getElementById("copy-link");
  const backBtn = document.getElementById("back-button");
  const saveNfcBtn = document.getElementById("save-nfc");
  const listNfcBtn = document.getElementById("list-nfc");
  const readNfcBtn = document.getElementById("read-nfc");
  const errorMsg = document.getElementById("error-message");
  const nfcWriteBtn = document.getElementById("nfc-write-button");
  
  let plants = [];
  const plantSearch = makeSelectSearchable(selector, 'plant-selector-search');
  const varietySearch = makeSelectSearchable(nameVarietySelector, 'name-variety-search');

  try {
    plants = await loadActiveNFCPlants();
    // Keep only plants active on the page and in NFC
    //plants = plants.filter(p => p.Active_in_page === 'Y' && p.Active_in_NFC === 'Y');
    plantData = plants;
    console.log("Plants loaded:", plants.length, "plants");
    selector.innerHTML = `<option value="">${msg('opt_variety')}</option>`;
    const uniqueNames = [...new Set(plants.map(p => p[nameProp]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    uniqueNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selector.appendChild(opt);
    });
    plantSearch.refresh();
  } catch (err) {
    console.error(err);
    showError(errorMsg, msg('err_plant_load'));
    selector.innerHTML = '<option value="">(error)</option>';
    return;
  }
  loadLastNfcId(nfcIdInput, () => updateNFCPreview());
  // Set current date
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  datumInput.value = dateString;

  // Plant selector change event
  selector.addEventListener("change", () => {
    const nameValue = selector.value;
    console.log("Plant selected, value:", nameValue);
    
    if (nameValue === "") {
      clearForm();
      selectedPlantIndex = null;
      selectedVarietyData = null;
      customVarietyMode = false;
      nameVarietyCustomInput.style.display = "none";
      return;
    }
    
    // Find the Species plant for this name, or fall back to the first match
    const speciesPlant = plants.find(p => p[nameProp] === nameValue && (p.Name_Variety || "").trim() === "Species");
    const plant = speciesPlant || plants.find(p => p[nameProp] === nameValue);
    
    console.log("Selected plant:", plant);
    
    if (plant) {
      selectedPlantIndex = plants.indexOf(plant);
      // Fill form fields
      plantIdInput.value = plant.Plant_ID || "";
      plantNameInput = plant[nameProp] || "";
      latinNameInput.value = plant.LatinName || "";
      datumInput.value = dateString;
      nfcTypInput.value = "n";
      egyebInput.value = "";
    }
    
    // Populate varieties dropdown based on plant name
    populateVarieties(nameValue);
    
    updatePreviews();
  });

  // Populate varieties dropdown
  function populateVarieties(plantName) {
    nameVarietySelector.innerHTML = `<option value="">${msg('opt_variety')}</option><option value="__custom__">-- Add custom --</option>`;
    customVarietyMode = false;
    nameVarietyCustomInput.style.display = "none";
    nameVarietyCustomInput.value = "";
    
    if (!plantName) {
      return;
    }
    
    // Find all plants with same name (language-aware)
    const varietiesSet = new Set();
    
    plants.forEach((plant, idx) => {
      if (plant[nameProp] === plantName) {
        const variety = (plant.Name_Variety || "").trim();
        if (variety && !varietiesSet.has(variety)) {
          varietiesSet.add(variety);
          const opt = document.createElement("option");
          opt.value = String(plant.Plant_ID || "");
          opt.textContent = variety;
          nameVarietySelector.appendChild(opt);
        }
      }
    });
    
    console.log("Found varieties:", varietiesSet.size);

    varietySearch.refresh();

    // Default to "Species" variety when available
    const speciesOption = Array.from(nameVarietySelector.options).find(opt => opt.textContent === "Species");
    if (speciesOption) {
      nameVarietySelector.value = speciesOption.value;
      nameVarietySelector.dispatchEvent(new Event('change'));
    }
  }

  // Variety selector change event
  nameVarietySelector.addEventListener("change", () => {
    const value = nameVarietySelector.value;
    console.log("Variety selected, value:", value);
    
    if (value === "") {
      // Clear variety selection
      selectedVarietyData = null;
      customVarietyMode = false;
      nameVarietyCustomInput.style.display = "none";
      nameVarietyCustomInput.value = "";
      updatePreviews();
      return;
    }
    
    if (value === "__custom__") {
      // Allow custom text input
      customVarietyMode = true;
      selectedVarietyData = null;
      nameVarietyCustomInput.style.display = "block";
      nameVarietyCustomInput.value = "";
      nameVarietyCustomInput.focus();
      updatePreviews();
      return;
    }
    
    // Load data from selected variety row
    customVarietyMode = false;
    nameVarietyCustomInput.style.display = "none";
    nameVarietyCustomInput.value = "";
    
    const varietyPlant = plants.find(plant => String(plant.Plant_ID || "") === value);
    
    console.log("Selected variety plant:", varietyPlant);
    
    if (varietyPlant) {
      selectedVarietyData = varietyPlant;
      selectedPlantIndex = plants.indexOf(varietyPlant);
      
      // Update all fields from this variety's data
      plantIdInput.value = varietyPlant.Plant_ID || "";
      plantNameInput = varietyPlant[nameProp] || "";
      latinNameInput.value = varietyPlant.LatinName || "";
      datumInput.value = dateString;
      nfcTypInput.value = "n";
      egyebInput.value = "";
      
      updatePreviews();
    }
  });

  // Custom variety input change event
  nameVarietyCustomInput.addEventListener("change", updatePreviews);
  nameVarietyCustomInput.addEventListener("input", updatePreviews);

  // Input change events - update previews
  [plantIdInput, latinNameInput, datumInput, nfcTypInput, egyebInput].forEach(input => {
    input.addEventListener("change", updatePreviews);
    input.addEventListener("input", updatePreviews);
  });
 //listener for nfcID change
    [nfcIdInput].forEach(input => {
    input.addEventListener("change", updatePreviews);
    input.addEventListener("input", updatePreviews);
  });      
  //gps

        function packBase64(lat, lon, alt, acc) {
            const latInt = Math.round((lat + 90) * 1000000); 
            const lonInt = Math.round((lon + 180) * 1000000);
            const altInt = Math.round(alt + 1000);
            const accInt = Math.round(acc + 1000);

            const buffer = new ArrayBuffer(12);
            const view = new DataView(buffer);
            view.setUint32(0, latInt); 
            view.setUint32(4, lonInt); 
            view.setUint16(8, altInt);
            view.setUint16(10, accInt); 

            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        }
//gps
        function unpackBase64(b64) {
            try {
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const view = new DataView(bytes.buffer);
                return {
                    lat: (view.getUint32(0) / 1000000 - 90).toFixed(6),
                    lon: (view.getUint32(4) / 1000000 - 180).toFixed(6),
                    alt: view.getUint16(8) - 1000,
                    acc: view.getUint16(10) - 1000
                };
            } catch (e) { return null; }
        }
//gps
        function startLiveCapture() {
           console.log("Start capture");
            if (watchId) navigator.geolocation.clearWatch(watchId);
            
            gpsStartBtn.style.display = "none";
            gpsStopBtn.style.display = "block";
            liveDot.style.display = "inline";
            setStatus(msg('gps_standby').replace('Standing by','Fetching GPS satellites…'), "orange",gpsStatus);

            const options = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };

            watchId = navigator.geolocation.watchPosition((pos) => {
                lastUpdateTime = Date.now();
                currentData.lat = pos.coords.latitude;
                currentData.lon = pos.coords.longitude;
                currentData.alt = pos.coords.altitude || 0;
                currentData.acc = pos.coords.accuracy;

                gpsDispLat.textContent = currentData.lat.toFixed(6);
                gpsDispLon.textContent = currentData.lon.toFixed(6);
                gpsDispAlt.textContent = Math.round(currentData.alt) + "m";
                gpsDispAcc.textContent = Math.round(currentData.acc) + "m";

                setStatus(`Updating… (${Math.round(currentData.acc)}m accuracy)`, "#0056b3",gpsStatus);

            }, (err) => setStatus("GPS Error: " + err.message, "red",gpsStatus), options);

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
                updateTimer.textContent = `Last improvement: ${seconds}s ago`;
            }, 1000);
        }

        function stopLiveCapture() {
            console.log("Stop");
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

                //calculation
                const b64 = packBase64(currentData.lat, currentData.lon, currentData.alt, currentData.acc);
                const gpstext = `L|${b64}|L`;
                posPacketOut.textContent = gpstext;
                posPacketSize.textContent = `${b64.length} B`;
                
            gpsStartBtn.style.display = "block";
            gpsStartBtn.textContent = msg('btn_gps_start');
            gpsStopBtn.style.display = "none";
            liveDot.style.display = "none";
            updateTimer.textContent = "Status: Data Locked";
 
            setStatus("Tracking Stopped. Data preserved.", "#333",gpsStatus);
            gpsPacket=gpstext;
            updatePreviews();
        }
 
  function updatePreviews() {
    //update NFC field
    updateNFCPreview();
  }

  function getVarietyText() {
    if (customVarietyMode && nameVarietyCustomInput.value) {
      return nameVarietyCustomInput.value;
    } else {
      return nameVarietySelector.options[nameVarietySelector.selectedIndex]?.text || 
             nameVarietySelector.value;
    }
  }
  function calculateSizeInBytes(text) {
  // Calculate size in bytes (UTF-8 encoding) - returns NUMBER
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return bytes.length;
   }

function formatSize(sizeInBytes) {
  // Convert bytes to appropriate unit - returns STRING
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
 }

function calculateSize(text) {
  // Kept for backward compatibility - returns STRING
  return formatSize(calculateSizeInBytes(text));
}

  function updateNFCPreview() {
    const plantId = plantIdInput.value;
    nfcIdValue = nfcIdInput.value;
    const plantName = plantNameInput;
    const nameVariety = getVarietyText();
    const latinName = latinNameInput.value;
    const datum = datumInput.value;
    const nfcTyp = nfcTypInput.value;
    const egyeb = egyebInput.value;
    let link = "";
    if (plantId) {
      const baseUrl = window.location.origin;
      link = `${baseUrl}/W/P.html?id=${encodeURIComponent(plantId)}`;
      linkPreview.textContent = link;
    }
    
    const nfcData = `${nfcIdValue}/${plantId}/${plantName}/${nameVariety}/${latinName}/${nfcTyp}/${datum}${gpsCardToggle.classList.contains('on') ? '/' + gpsPacket : ''}${othCardToggle.classList.contains('on') ? '/' + egyeb : ''}/`;
    nfcPreview.textContent = nfcData;
    
    // Update size indicator
    if (nfcSize) {
      const linkSizeBytes = calculateSizeInBytes(link);
      const nfcSizeBytes = calculateSizeInBytes(nfcData);
      const totalSizeBytes = linkSizeBytes + nfcSizeBytes;
      nfcSize.textContent = formatSize(nfcSizeBytes);
      totalSize.textContent = formatSize(totalSizeBytes);
      linkSize.textContent = formatSize(linkSizeBytes);
    } else {
      linkPreview.textContent = msg('ph_link_preview');
      nfcPreview.textContent = msg('ph_nfc_preview');
      if (linkSize) {
        nfcSize.textContent = "0 B";
        linkSize.textContent = "0 B";
        totalSize.textContent = "0 B";
      }
    }   
  }
  updateNFCPreviewFn = updateNFCPreview;
  //Gps
  if (gpsStartBtn) {
  gpsStartBtn.addEventListener("click", () => {
    console.log("button pressed startLiveCapture");
    startLiveCapture();

    });}
  if (gpsStopBtn) {
  gpsStopBtn.addEventListener("click", stopLiveCapture);
  }  
  // Generate NFC button
  if (gennfcBtn) {
  gennfcBtn.addEventListener("click", () => {
    loadLastNfcId(nfcIdInput);
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    
    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_plant'));
      return;
    }
  });}

    // Generate QR NFC button
  if (qrnfcBtn) {
  qrnfcBtn.addEventListener("click", () => {
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    const link = linkPreview.textContent;
    const combined = nfcData + " " + link;
    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_plant'));
      return;
    }
    
    const encodedData = encodeURIComponent(combined);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    
    const win = window.open(qrCodeUrl, "_blank");
    if (!win) {
      showError(errorMsg, msg('err_qr_fail'));
    } else {
      showError(errorMsg, msg('err_qr_ok'), "success");
    }
  });}

  // Copy NFC Data button
  if (copynfcBtn) {
  copynfcBtn.addEventListener("click", () => {
    const nfcData = nfcPreview.textContent;
    
    if (isPlaceholder(nfcData)) {
      showError(errorMsg, msg('err_no_nfc'));
      return;
    }
    
    navigator.clipboard.writeText(nfcData).then(() => {
      showError(errorMsg, msg('err_copy_nfc_ok'), "success");
    }).catch(err => {
      showError(errorMsg, msg('err_copy_fail') + err.message);
    });
  });}

  // Copy Link button
  if (copylinkBtn) {
  copylinkBtn.addEventListener("click", () => {
    const link = linkPreview.textContent;
    
    if (isPlaceholder(link) || !link) {
      showError(errorMsg, msg('err_no_link'));
      return;
    }
    
    navigator.clipboard.writeText(link).then(() => {
      showError(errorMsg, msg('err_copy_link_ok'), "success");
    }).catch(err => {
      showError(errorMsg, msg('err_copy_fail') + err.message);
    });
  });}

  // Back button
  if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "Homepage.html";
  });}

  // List NFC button
  if (listNfcBtn) {
  listNfcBtn.addEventListener("click", () => {
    window.location.href = "NFCListPage.html";
  });}

  // Read NFC button
  if (readNfcBtn) {
  readNfcBtn.addEventListener("click", () => {
    window.location.href = "Nfcreader.html";
  });}
  
  // Save NFC button – appends a row to the nfc_list sheet via the Apps Script Web App
  if (saveNfcBtn) {
  saveNfcBtn.addEventListener("click", async () => {
    updatePreviews();
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const nfcId      = nfcIdInput.value;
    const plantIdValue    = plantIdInput.value;
    const nfcData    = nfcPreview.textContent;
    const nfcTyp     = nfcTypInput.value;
    const datum      = datumInput.value;
    const nfcCreated = dateString;
    const nfcPos     = posPacketOut.textContent;
    const link       = linkPreview.textContent;
    const egyeb      = egyebInput.value;
    const serialNum  = serialNumText.value; 
    
    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_save'));
      return;
    }

    if (SHEET_WRITER_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
      showError(errorMsg, msg('err_no_config'));
      return;
    }

    saveNfcBtn.disabled = true;
    try {
      const response = await fetch(SHEET_WRITER_URL, {
        method: 'POST',
        // Apps Script Web Apps accept text/plain without a CORS preflight.
        // The body is still valid JSON, parsed by the Apps Script handler.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ key: SHEET_WRITER_SECRET, nfcId, plantId: plantIdValue, nfcTyp, datum, nfcCreated, nfcPos, nfcData, link, other: egyeb,serialNum }),
        redirect: 'follow',
      });
      const result = await response.json().catch(() => ({}));
      if (result.status === 'success') {
        showError(errorMsg, msg('err_save_ok'), "success");
      } else {
        showError(errorMsg, msg('err_save_fail') + (result.error || "Unknown error"));
      }
    } catch (err) {
      showError(errorMsg, msg('err_save_fail') + err.message);
    } finally {
      loadLastNfcId(nfcIdInput);
      saveNfcBtn.disabled = false;
      updatePreviews();
    }
  });}

  //save end

  // NFC Write button – writes nfc-preview (text) and link-preview (url) to a physical NFC tag
  if (nfcWriteBtn) {
  nfcWriteBtn.addEventListener("click", async () => {
    updatePreviews();
    const nfcData = nfcPreview.textContent;
    const link    = linkPreview.textContent;

    if (selectedPlantIndex == null) {
      showError(errorMsg, msg('err_no_save'));
      return;
    }

    if (!('NDEFReader' in window)) {
      showError(errorMsg, msg('err_nfc_ns'));
      return;
    }

    nfcWriteBtn.disabled = true;
    showError(errorMsg, msg('err_nfc_tap'), "info");

    try {
      const ndef = new NDEFReader();
      await ndef.scan();
      ndef.addEventListener("reading", (event) => {
        serialNumText.value = event.serialNumber;
        console.log("Tag UID:", event.serialNumber);
      });
      await ndef.write({
        records: [
          { recordType: "text", data: nfcData },
          { recordType: "url",  data: link }
        ]
      });
      showError(errorMsg, msg('err_nfc_ok'), "success");
    } catch (error) {
      showError(errorMsg, msg('err_nfc_write') + error);
      console.error(error);
    } finally {
        nfcWriteBtn.disabled = false;
    } 
  });}//end

  function clearForm() {
    plantIdInput.value = "";
    nfcIdInput.value = "";
    plantNameInput = "";
    nameVarietySelector.innerHTML = `<option value="">${msg('opt_variety')}</option>`;
    nameVarietyCustomInput.value = "";
    nameVarietyCustomInput.style.display = "none";
    latinNameInput.value = "";
    datumInput.value = dateString;
    nfcTypInput.value = "n";
    egyebInput.value = "";
    nfcPreview.textContent = msg('ph_nfc_preview');
    nfcSize.textContent = "0 B";
    linkPreview.textContent = msg('ph_link_preview');
    linkSize.textContent = "0 B";
    totalSize.textContent = "0 B";
    serialNumText.textContent = "none";
  }

  function showError(el, message, type = "error") {
    el.textContent = message;
    el.className = 'status-msg ' + (type === 'success' ? 'success' : type === 'info' ? 'info' : 'error');
    el.style.display = "block";
    
    if (type === "success") {
      setTimeout(() => {
        el.textContent = "";
        el.className = 'status-msg';
      }, 3000);
    }
  }

  // Set current date on load
  datumInput.value = dateString;

  // Pre-select plant and variety from URL params (when navigating from Homepage)
  const params = new URLSearchParams(window.location.search);
  const paramName = params.get('name');
  const paramplantId = params.get('plantId');

  if (paramName) {
    selector.value = paramName;
    selector.dispatchEvent(new Event('change'));

    if (paramplantId) {
      // Find the option whose plant has the matching plantId
      const matchOpt = Array.from(nameVarietySelector.options).find(opt => {
        if (!opt.value || opt.value === '__custom__') return false;
        const idx = parseInt(opt.value);
        return String(plants[idx]?.Plant_ID) === paramplantId;
      });
      if (matchOpt) {
        nameVarietySelector.value = matchOpt.value;
        nameVarietySelector.dispatchEvent(new Event('change'));
      }
    }
  }
}// end pop

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
setupLanguageButtons();
if (gpsCardToggle) {
gpsCardToggle.addEventListener('click', () => {
  gpsCardToggle.classList.toggle('on');
  const isOn = gpsCardToggle.classList.contains('on');
  gpsCardBody.style.display = isOn ? 'block' : 'none';
  // Auto-open the GPS panel when turning on
  const gpsPanel = document.getElementById('panel-gps');
  if (isOn && gpsPanel && !gpsPanel.classList.contains('open')) {
    gpsPanel.classList.add('open');
  }
  if (updateNFCPreviewFn) updateNFCPreviewFn();
});}
if (othCardToggle) {
othCardToggle.addEventListener('click', () => {
  othCardToggle.classList.toggle('on');
  const isOn = othCardToggle.classList.contains('on');
  othCardBody.style.display = isOn ? 'block' : 'none';
  // Auto-open the Other panel when turning on
  const othPanel = document.getElementById('panel-other');
  if (isOn && othPanel && !othPanel.classList.contains('open')) {
    othPanel.classList.add('open');
  }
});}
