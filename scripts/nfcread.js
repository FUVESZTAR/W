
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
// ─────────────────────────────────────────────────────────────────────────────

/** Use the page-level i18n helper if available, otherwise return the key. */
function msg(key) {
  return t('nfcread.' + key);
}

/** Placeholder text in either language – used to detect "no real data yet" */
const NFC_PLACEHOLDER_KEYS = ['ph_nfc_preview', 'ph_link_preview'];
function isPlaceholder(text) {
  return !text || NFC_PLACEHOLDER_KEYS.some(k => {
    return ['en','hu'].some(lang => {
      const translations = TRANSLATIONS[lang];
      return translations && translations['nfcread.' + k] === text;
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
const plantIdInput = document.getElementById("plantId");
const datumInput = document.getElementById("datum");
const plantNameInput = document.getElementById("name-plant");
const nameVarietyInput = document.getElementById("name-variety");
const latinNameInput = document.getElementById("latin-name");
const nfcTypInput = document.getElementById("nfcTyp");
const egyebInput = document.getElementById("egyeb");
const nfcPreview = document.getElementById("nfc-preview");
const linkPreview = document.getElementById("link-preview");

  const readNfcBtn = document.getElementById("read-nfc");
  const openLinkBtn = document.getElementById("open-link-button");
const clearBtn = document.getElementById("clear-button");
  const copyNfcBtn = document.getElementById("copy-nfc");
const genNfcBtn = document.getElementById("gen-nfc");
const listNfcBtn = document.getElementById("list-nfc");
  const copyLinkBtn = document.getElementById("copy-link");
  const backBtn = document.getElementById("back-button");
  const saveNfcBtn = document.getElementById("save-nfc");
  const errorMsg = document.getElementById("error-message");

const gpsDispLat = document.getElementById('gpsDispLat');
const gpsDispLon = document.getElementById('gpsDispLon');
const gpsDispAlt = document.getElementById('gpsDispAlt');
const gpsDispAcc = document.getElementById('gpsDispAcc');
const posPacketSize = document.getElementById('posPacketSize');
const posPacketOut = document.getElementById('posPacketOut');
const nfcSize = document.getElementById("nfc-size");
const linkSize = document.getElementById("link-size");
const totalSize = document.getElementById("total-size");

const serialNumText = document.getElementById("serialNr");

const gpsCardBody = document.getElementById('gps_card_body');
const othCardBody = document.getElementById('oth_card_body');
const NFC_TYP_LIST= { n: 'n – plant', o: 'o – graft', m: 'm – seed'};
//gps
        let currentData = { lat: 0, lon: 0, alt: 0 };
        let lastUpdateTime = Date.now();
        let timerInterval;
        let watchId = null;

  function setStatus(msg_text, color) {
            const s = gpsStatus;
            s.textContent = msg_text;
            s.style.background = color;
            s.style.color = "white";
        }
/* Fetches the last value from column A of the NFC list sheet via the
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

async function readNfc(onRead) {
  if (!('NDEFReader' in window)) {
      showError(errorMsg, msg('err_nfc_ns'));
      return;
    } else {
     readNfcBtn.disabled = true;
      showError(errorMsg, msg('err_nfc_tap'), "info");
  }
  
  try {
 // console.log("NFC read "+ id);
    const ndef = new NDEFReader();
    await ndef.scan();

       ndef.onreading = (event) => {
         const result = {
           id: event.serialNumber,
           records: []
         };

         for (const record of event.message.records) {
           let value = "";

           switch (record.recordType) {
             case "text":
               value = new TextDecoder(record.encoding).decode(record.data);
               break;

             case "url":
               value = new TextDecoder().decode(record.data);
               break;
     
             case "mime":
               value = new TextDecoder().decode(record.data);
               break;

             default:
               value = new TextDecoder().decode(record.data);
           }

           result.records.push({
             type: record.recordType,
             value
           });
         }

         onRead(result);
      }; //end on reading
    showError(errorMsg, msg('err_nfc_scan_ok'), "info");
    } catch (error) {
      showError(errorMsg, msg('err_nfc_read') + error);
      console.error(error);
    } finally {
        readNfcBtn.disabled = false;
    } 
} //end readNfc

async function populate() {

  // Use language-aware name property
  const currentLang = getCurrentLang();
  const nameProp = currentLang === 'en' ? 'Name_EN' : 'Name_HU';

  let plants = [];
  let lastId = null;
  
  function decodeToMap(str, keys) {
     const packets = [];
     let index = 0;
     // 1. protect packets (NO leading/trailing / required)
     const protectedStr = str.replace(/L\|([\s\S]*?)\|L/g, (_, content) => {
       packets.push(content);
       return `__PKT_${index++}__`;
     });
     // 2. split normally
     const parts = protectedStr.split("/");
     // 3. restore packets
     const values = parts.map(p => {
       const match = p.match(/^__PKT_(\d+)__$/);
       return match ? packets[match[1]] : p;
     });
     // 4. map to keys
     return Object.fromEntries(
       keys.map((k, i) => [k, { value: values[i] ?? "" }])
     );
   }//end decodeToMap
 
//unpackBase64
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
        } // end unpackBase64
  
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
  
      // data
function handlePlantData(data) {
    const plant = {};
    let text = "";
    let link = "";
    clearForm();
    console.log("New tag detected:", data.id); 
    serialNumText.value = data.id;
    data.records.forEach(r => {
      if (r.type === "text") { text = r.value; console.log("Text: ", r.value);}
      if (r.type === "url") { link = r.value; console.log("URL: ", r.value);} 
     });
    
    nfcPreview.textContent = text;
    linkPreview.textContent= link;
    /* 5/1/Alma/Species/Malus domestica/n/2026-04-09/L|BV1KgAq6lQAD6A==|L/oth  */
    const keys = ["ncfId","plantId","name","variety","latinName","nfcType","datum","pos","other"];
    let decodedNfc = decodeToMap(text, keys);
    console.log(decodedNfc);;

    nfcIdInput.value= decodedNfc.ncfId.value;
    plantIdInput.value= decodedNfc.plantId.value;
    latinNameInput.value= decodedNfc.latinName.value;
    plantNameInput.value = decodedNfc.name.value;
    nameVarietyInput.value = decodedNfc.variety.value;
    nfcTypInput.value= decodedNfc.nfcType.value;
    datumInput.value= decodedNfc.datum.value;
    posPacketOut.textContent= decodedNfc.pos.value;
    //nfcCreated.value = "";
    egyebInput.value= decodedNfc.other.value;
  
    const  pos = decodedNfc.pos.value;
    if (pos) {
       const posSizeBytes = calculateSizeInBytes(pos);
       posPacketSize.textContent = formatSize(posSizeBytes);

       const gpsData = unpackBase64(pos);
       if (gpsData) {
                        gpsDispLat.innerText = gpsData.lat;
                        gpsDispLon.innerText = gpsData.lon;
                        gpsDispAlt.innerText = gpsData.alt + "m";
                        gpsDispAcc.innerText = gpsData.acc + "m";
           }
      }
    //size
    if (link || text) {
       const linkSizeBytes = calculateSizeInBytes(link);
       const nfcSizeBytes = calculateSizeInBytes(text);
       nfcSize.textContent = formatSize(nfcSizeBytes);
       linkSize.textContent = formatSize(linkSizeBytes);
       totalSize.textContent = formatSize(nfcSizeBytes + linkSizeBytes);
    }
    
}     //end

  //read
  function nfcReadFunc() {
     readNfc((data) => {
       if (data.id === lastId) return; // prevent spam
       lastId = data.id;
       console.log("New tag detected:", data);
       // update UI
       handlePlantData(data);
   });
  } 

  nfcReadFunc();
  

//nfc reading decoding
//const input = "5/1/Alma/Species/Malus domestica/n/2026-04-09/L|BV1KgAq6lQAD6A==|L/oth";

  // Copy NFC Data button
   if (copyNfcBtn) {
  copyNfcBtn.addEventListener("click", () => {
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
  if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", () => {
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
 
  // NFC Read button
  if (readNfcBtn) {
  readNfcBtn.addEventListener("click", () => {
     nfcReadFunc();
  });}
 
  // Back button
  if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "Homepage.html";
  });}

  // Gen NFC button
  if (genNfcBtn) {
  genNfcBtn.addEventListener("click", () => {
    window.location.href = "pages/Nfcgenerator.html";
  });}

  // List NFC button
  if (listNfcBtn) {
  listNfcBtn.addEventListener("click", () => {
    window.location.href = "pages/NFCListPage.html";
  });}
  
  // Save NFC button – appends a row to the nfc_list sheet via the Apps Script Web App
  /*if (saveNfcBtn) {
  saveNfcBtn.addEventListener("click", async () => {
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
    const serialNum      = serialNumText.value;

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
        body: JSON.stringify({ key: SHEET_WRITER_SECRET, nfcId, plantId: plantIdValue, nfcTyp, datum, nfcCreated, nfcPos, nfcData, link, other: egyeb, serialNum}),
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
      saveNfcBtn.disabled = false;
    }
  });}*/
  //save end
  //open link
  if (openLinkBtn) {
   openLinkBtn.addEventListener("click", () => {
    const link = linkPreview.textContent.trim();
    if (!link) {
        console.warn("Link is empty");
        return;
    }
    try {
        new URL(link); // validate
        window.location.href = link;
      } catch {
       console.error("Invalid URL:", link);
    }
});}
  
  // clear with button
   if (clearBtn) {
   clearBtn.addEventListener("click", () => {
     clearForm();
      });}
  // clear all
  function clearForm() {
    plantIdInput.value = "";
    nfcIdInput.value = "";
    plantNameInput.value = "";
    nameVarietyInput.value = "";
    latinNameInput.value = "";
    datumInput.value = "";
    nfcTypInput.value = "";
    egyebInput.value = "";
    serialNumText.value = "";
    nfcPreview.textContent = msg('ph_nfc_preview');
    linkPreview.textContent = msg('ph_link_preview');
    nfcSize.textContent = "0 B";
    linkSize.textContent = "0 B";
    totalSize.textContent = "0 B";
    posPacketOut.textContent= "";
    gpsDispLat.innerText = "";
    gpsDispLon.innerText = "";
    gpsDispAlt.innerText = "";
    gpsDispAcc.innerText = "";
    posPacketSize.textContent = "0 B";
    //nfcCreated.value = "";
  }


} // end pop

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populate);
} else {
  populate();
}
setupLanguageButtons();

