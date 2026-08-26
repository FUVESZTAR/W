/*
<!-- ════════════════════════════════════════════════════════════════════════ -->
<!--  ALL JAVASCRIPT — merged from csv-utils.js / lang.js / plantinfo.js    -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
*/
import { loadPlantIdWithVarieties } from "./csv-utils.js";
import { loadPlantImage } from "./loadPlantImagesGdrive.js.js";
/* ══════════════════════════════════════════════════════════════════════════
   csv-utils.js  (inlined)
══════════════════════════════════════════════════════════════════════════ */
function splitPipe(value) {
  if (!value) return [];
  return String(value).split('|').map(s => s.trim()).filter(Boolean);
}

function monthsFromValue(value) {
  if (!value) return [];
  const months = new Set();
  splitPipe(String(value)).forEach(token => {
    const match = token.match(/^(\d{1,2})(?:\.\d)?$/);
    if (match) {
      const m = parseInt(match[1], 10);
      if (m >= 1 && m <= 12) months.add(m);
    }
  });
  return Array.from(months);
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCSVLine(line));
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ══════════════════════════════════════════════════════════════════════════
   lang.js  (inlined — minimal implementation)
══════════════════════════════════════════════════════════════════════════ */
let _currentLang = localStorage.getItem('lang') || 'en';

const _translations = {
  en: {
    'page.title.detail': 'Plant Sheet',
    'detail.btn.back': '← Back',
    'detail.noPlantSelected': 'No plant selected',
    'detail.noPlantSelectedMsg': 'Please go back and select a plant.',
    'detail.plantNotFound': 'Plant not found',
    'detail.plantNotFoundMsg': 'No plant found with the given ID.',
    'detail.error.loadPlant': 'Error loading plant data.',
    'detail.noVarieties': 'No other varieties found.',
    'detail.section.calendar': 'Calendar',
    'detail.section.planning': 'Planning',
    'detail.section.varieties': 'List of Varieties',
    'detail.section.nfcLink': 'NFC Link:',
    'detail.label.names': 'Names:',
    'detail.label.edibilityTitle': 'Edibility:',
    'detail.label.medicinalTitle': 'Medicinal:',
    'detail.label.harvestParts': 'Harvest parts:',
    'detail.label.preparationToEdibility': 'Preparation to Edibility:',
    'detail.label.medicinalUse': 'Medicinal use:',
    'detail.label.datastatus': '',
    'detail.legend.edibleRaw': 'Green = Edible Raw',
    'detail.legend.ediblePrepared': 'Yellow = Edible Prepared',
    'detail.legend.toxic': 'Red = Toxic',
    'detail.legend.inedible': 'Black = Inedible',
    'planning.plantingCover': 'Planting in Cover',
    'planning.plantingGround': 'Planting in Ground',
    'planning.harvestingCover': 'Harvesting in Cover',
    'planning.harvestingGround': 'Harvesting in Ground',
    'cal.tracks.planting': 'Planting',
    'cal.tracks.flowering': 'Flowering',
    'cal.tracks.occupyingSpace': 'Space occupying',
    'cal.tracks.harvestMaturity': 'Harvest maturity',
    'cal.tracks.harvesting': 'Harvesting',
    'cal.tracks.eatingMaturity': 'Eating maturity',
    'cal.tracks.harvestStoring': 'Storage',
    'cal.tracks.seedSaving': 'Seed Saving',
    'cal.months': ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
    // field card labels
    'detail.label.latinname': 'Latin Name',
    'detail.label.namevariety': 'Variety',
    'detail.label.namehu': 'Hungarian Name',
    'detail.label.nameen': 'English Name',
    'detail.label.genus': 'Genus',
    'detail.label.family': 'Family',
    'detail.label.namesz': 'Names',
    'detail.label.planttype': 'Plant Type',
    'detail.label.rawediblepartsall': 'Edible Raw',
    'detail.label.onlypreparedediblepartsall': 'Edible Prepared',
    'detail.label.toxicpartsall': 'Toxic Parts',
    'detail.label.medicinalpartsall': 'Medicinal Parts',
    'detail.label.preparationall': 'Preparation',
    'detail.label.medicinaluse': 'Medicinal Use',
    'detail.label.dangersofplant': 'Dangers',
    'detail.label.uses': 'Uses',
    'detail.label.plantingtimeunderglassmonths': 'Planting Under Glass',
    'detail.label.plantingtimeingroundmonth': 'Planting In Ground',
    'detail.label.occupyingspacemonth': 'Space Occupying',
    'detail.label.floweringtimemonth': 'Flowering Time',
    'detail.label.plantheightmax': 'Height Max (mm)',
    'detail.label.plantheightavg': 'Height Avg (mm)',
    'detail.label.plantwidthmax': 'Width Max (mm)',
    'detail.label.plantwidthavg': 'Width Avg (mm)',
    'detail.label.rootdepthavg': 'Root Depth Avg (mm)',
    'detail.label.rootwidthavg': 'Root Width Avg (mm)',
    'detail.label.plantspacefilling': 'Space Filling (mm)',
    'detail.label.plantplantingseeddeptmm': 'Seed Planting Depth (mm)',
    'detail.label.seedsoiltemperature': 'Seed Soil Temperature (°C)',
    'detail.label.plantdistance': 'Plant Distance (mm)',
    'detail.label.daystogermination': 'Days to Germination',
    'detail.label.daystomaturity': 'Days to Maturity',
    'detail.label.daystoharvest': 'Days to Harvest',
    'detail.label.plantsperm2': 'Plants per m²',
    'detail.label.plantingstyle': 'Planting Style',
    'detail.label.cultivationtype': 'Cultivation Type',
    'detail.label.lifecycle': 'Lifecycle',
    'detail.label.growthhabit': 'Growth Habit',
    'detail.label.plantinglocation': 'Planting Location',
    'detail.label.plantflowercolor': 'Flower Colour',
    'detail.label.leafcolor': 'Leaf Colour',
    'detail.label.hardinesszoneusda': 'Hardiness Zone (USDA)',
    'detail.label.minimumtemperature': 'Minimum Temperature',
    'detail.label.plantdescription': 'Plant Description',
    'detail.label.ediblepartsdescription': 'Edible Parts Description',
    'detail.label.benefits': 'Benefits',
    'detail.label.neededpolinators': 'Needed Pollinators',
    'detail.label.nativerange': 'Native Range',
    'detail.label.propagation': 'Propagation',
    'detail.label.seedsurvivaltime': 'Seed Survival Time (months)',
    'detail.label.fruitlength': 'Fruit Length (mm)',
    'detail.label.fruitwidth': 'Fruit Width (mm)',
    'detail.label.fruitweight': 'Fruit Weight (g)',
    'detail.label.shadetolerance': 'Shade Tolerance',
    'detail.label.moistureneed': 'Moisture Need',
    'detail.label.soilneed': 'Soil Need',
    'detail.label.phneed': 'pH Need',
    'detail.label.growthrate': 'Growth Rate',
    'detail.label.windtolerance': 'Wind Tolerance',
    'detail.label.wateringregime': 'Watering Regime',
    'detail.label.pestresistance': 'Pest Resistance',
    'detail.label.nitrogenfixer': 'Nitrogen Fixer',
    'detail.label.roottype': 'Root Type',
    'detail.label.foliagetype': 'Foliage Type',
    'detail.label.flowertype': 'Flower Type',
    'detail.label.storageduration': 'Storage Duration (months)',
    'detail.label.yieldperplant': 'Yield per Plant',
    'detail.label.companionplants': 'Companion Plants',
    'detail.label.allopaticeffect': 'Allopathic Effect',
    'detail.label.allopaticsensitivity': 'Allopathic Sensitivity',
    'detail.label.allopatictolerance': 'Allopathic Tolerance',
    'detail.label.soilmicrobiology': 'Soil Microbiology',
    'detail.label.activeinpage': 'Active in Page',
    'detail.label.activeinnfc': 'Active in NFC',
    'detail.label.datastatus': 'Data Status',
    'detail.label.sourceofplant': 'Source',
    'detail.label.statusdatasource': 'Status / Data Source',
    'detail.label.listofvarieties': 'List of Varieties',
    'detail.label.egyeb': 'Other',
    // harvesting months (shown in field cards if create)
    'detail.label.rootharvestingtimemonth': 'Root Harvest',
    'detail.label.stemharvestingtimemonth': 'Stem Harvest',
    'detail.label.leafharvestingtimemonth': 'Leaf Harvest',
    'detail.label.flowerharvestingtimemonth': 'Flower Harvest',
    'detail.label.fruitharvestingtimemonth': 'Fruit Harvest',
    'detail.label.seedharvestingtimemonth': 'Seed Harvest',
    'detail.label.barkharvestingtimemonth': 'Bark Harvest',
    'detail.label.pollenharvestingtimemonth': 'Pollen Harvest',
    'detail.label.woodharvestingtimemonth': 'Wood Harvest',
    'detail.label.apicalbudharvestingtimemonth': 'Apical Bud Harvest',
    'detail.label.seedpodharvestingtimemonth': 'Seedpod Harvest',
    'detail.label.mannaharvestingtimemonth': 'Manna Harvest',
    'detail.label.shootharvestingtimemonth': 'Shoot Harvest',
    'detail.label.nectarharvestingtimemonth': 'Nectar Harvest',
    'detail.label.sapharvestingtimemonth': 'Sap Harvest',
    'detail.label.harvestingtimeunderglassmonth': 'Harvest Under Glass',
    'detail.label.harvestingtimeingroundmonth': 'Harvest In Ground',
    'detail.label.eatingmaturitytimeinmonth': 'Eating Maturity',
    'detail.label.harveststoringmonth': 'Harvest Storing',
  },
  hu: {
    'page.title.detail': 'Növény lap',
    'detail.btn.back': '← Vissza',
    'detail.noPlantSelected': 'Nincs növény kiválasztva',
    'detail.noPlantSelectedMsg': 'Kérjük, menjen vissza és válasszon növényt.',
    'detail.plantNotFound': 'A növény nem található',
    'detail.plantNotFoundMsg': 'Nem található növény a megadott azonosítóval.',
    'detail.error.loadPlant': 'Hiba a növény adatainak betöltésekor.',
    'detail.noVarieties': 'Nem találhatók más fajták.',
    'detail.section.calendar': 'Naptár',
    'detail.section.planning': 'Tervezés',
    'detail.section.varieties': 'Fajták listája',
    'detail.section.nfcLink': 'NFC Link:',
    'detail.label.names': 'Nevek:',
    'detail.label.edibilityTitle': 'Ehetőség:',
    'detail.label.medicinalTitle': 'Gyógyászat:',
    'detail.label.harvestParts': 'Betakarítható részek:',
    'detail.label.preparationToEdibility': 'Elkészítés az ehetőséghez:',
    'detail.label.medicinalUse': 'Gyógyászati felhasználás:',
    'detail.label.datastatus': '',
    'detail.legend.edibleRaw': 'Zöld = Nyersen ehető',
    'detail.legend.ediblePrepared': 'Sárga = Elkészítve ehető',
    'detail.legend.toxic': 'Piros = Mérgező',
    'detail.legend.inedible': 'Fekete = Nem ehető',
    'planning.plantingCover': 'Ültetés fóliasátorban',
    'planning.plantingGround': 'Ültetés szabadföldben',
    'planning.harvestingCover': 'Betakarítás fóliasátorban',
    'planning.harvestingGround': 'Betakarítás szabadföldben',
    'cal.tracks.planting': 'Ültetés',
    'cal.tracks.flowering': 'Virágzás',
    'cal.tracks.occupyingSpace': 'Helyfoglalás',
    'cal.tracks.harvestMaturity': 'Betakarítási érettség',
    'cal.tracks.harvesting': 'Betakarítás',
    'cal.tracks.eatingMaturity': 'Fogyasztási érettség',
    'cal.tracks.harvestStoring': 'Tárolás',
    'cal.tracks.seedSaving': 'Magmentés',
    'cal.months': ['JAN','FEB','MÁR','ÁPR','MÁJ','JÚN','JÚL','AUG','SZE','OKT','NOV','DEC'],
  }
};

function t(key) {
  const lang = _translations[_currentLang] || _translations['en'];
  const fallback = _translations['en'];
  const val = lang[key] ?? fallback[key] ?? key;
  if (Array.isArray(val)) return val;
  return val;
}

function getCurrentLang() { return _currentLang; }

function setupLanguageButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.dataset.lang === _currentLang) btn.classList.add('active');
    btn.addEventListener('click', () => {
      _currentLang = btn.dataset.lang;
      localStorage.setItem('lang', _currentLang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === _currentLang));
      applyTranslations();
    });
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    if (typeof val === 'string') el.textContent = val;
  });
  const titleKey = document.documentElement.getAttribute('data-i18n-title');
  if (titleKey) document.title = t(titleKey);
}

/* ══════════════════════════════════════════════════════════════════════════
   plantinfo.js  (inlined — full logic)
══════════════════════════════════════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────────────────
const DEFAULT_BASE_REAL_SIZE_MM = { width: 845, height: 1800 };

const ROW_COLORS = [
  '#F7E6A4','#F7E6A4','#F7B0A1','#A4F7A4',
  '#F7E6A4','#F7E6A4','#A4F7DA','#F7E6A4',
];

const PARTS = [
  "root","shoot","stem","wood","sap","apicalbud",
  "bark","leaf","flower","nectar","pollen","fruit","seedpod","seed"
];

const PART_ICON_MAP = {
  leaf:     { class:'leaf-harvest-icon',     symbol:'#icon-leaf',     symbolid:'icon-leaf'     },
  stem:     { class:'stem-harvest-icon',     symbol:'#icon-stem',     symbolid:'icon-stem'     },
  flower:   { class:'flower-harvest-icon',   symbol:'#icon-flower',   symbolid:'icon-flower'   },
  fruit:    { class:'fruit-harvest-icon',    symbol:'#icon-fruit',    symbolid:'icon-fruit'    },
  seed:     { class:'seed-harvest-icon',     symbol:'#icon-seed',     symbolid:'icon-seed'     },
  root:     { class:'root-harvest-icon',     symbol:'#icon-root',     symbolid:'icon-root'     },
  shoot:    { class:'shoot-harvest-icon',    symbol:'#icon-shoot',    symbolid:'icon-shoot'    },
  wood:     { class:'wood-harvest-icon',     symbol:'#icon-wood',     symbolid:'icon-wood'     },
  sap:      { class:'sap-harvest-icon',      symbol:'#icon-sap',      symbolid:'icon-sap'      },
  apicalbud:{ class:'apicalbud-harvest-icon',symbol:'#icon-apicalbud',symbolid:'icon-apicalbud'},
  bark:     { class:'bark-harvest-icon',     symbol:'#icon-bark',     symbolid:'icon-bark'     },
  nectar:   { class:'nectar-harvest-icon',   symbol:'#icon-nectar',   symbolid:'icon-nectar'   },
  pollen:   { class:'pollen-harvest-icon',   symbol:'#icon-pollen',   symbolid:'icon-pollen'   },
  seedpod:  { class:'seedpod-harvest-icon',  symbol:'#icon-seedpod',  symbolid:'icon-seedpod'  },
  none:     { class:'none-harvest-icon',     symbol:'#icon-none',     symbolid:'icon-none'     },
};

const T_CODE_MAP = {
  shade_tolerance: { F:'full shade', S:'semi-shade', N:'no shade' },
  moisture_need:   { D:'dry', M:'moist', We:'wet', Wa:'water' },
  soil_need:       { L:'light (sandy)', M:'medium', H:'heavy (clay)' },
  ph_need:         { A:'acid', N:'neutral', B:'basic (alkaline)' },
  growth_rate:     { S:'slow', M:'medium', F:'fast' },
  wind_tolerance:  { L:'low', M:'moderate', H:'high' },
};

const HARVEST_PART_COLUMNS = [
  { key:'Leaf_Harvesting_time_month',       term:'leaf'      },
  { key:'Stem_Harvesting_time_month',       term:'stem'      },
  { key:'Flower_Harvesting_time_month',     term:'flower'    },
  { key:'Fruit_Harvesting_time_month',      term:'fruit'     },
  { key:'Seed_Harvesting_time_month',       term:'seed'      },
  { key:'Root_Harvesting_time_month',       term:'root'      },
  { key:'Shoot_Harvesting_time_month',      term:'shoot'     },
  { key:'Wood_Harvesting_time_month',       term:'wood'      },
  { key:'Sap_Harvesting_time_month',        term:'sap'       },
  { key:'Apical_bud_Harvesting_time_month', term:'apicalbud' },
  { key:'Bark_Harvesting_time_month',       term:'bark'      },
  { key:'Nectar_Harvesting_time_month',     term:'nectar'    },
  { key:'Pollen_Harvesting_time_month',     term:'pollen'    },
  { key:'Seedpod_Harvesting_time_month',    term:'seedpod'   },
];

const CATEGORY_PART_COLUMNS = [
  'Raw_edible_parts_all',
  'Prepared_edible_parts_all',
  'Toxic_parts_all',
  'Medicinal_parts_all',
];

const BASIC_FIED_MAP = [
  { key:'latin_name',         data:'LatinName',          typ:'normal',     use:'log',    i18n:'latinname'         },
  { key:'name_variety',       data:'Name_Variety',       typ:'normal',     use:'log',    i18n:'namevariety'       },
  { key:'name_hu',            data:'Name_HU',            typ:'normal',     use:'log',    i18n:'namehu'            },
  { key:'name_en',            data:'Name_EN',            typ:'normal',     use:'log',    i18n:'nameen'            },
  { key:'genus',              data:'Genus',              typ:'normal',     use:'log',    i18n:'genus'             },
  { key:'family',             data:'Family',             typ:'normal',     use:'log',    i18n:'family'            },
  { key:'name_sz',            data:'Name_SZ',            typ:'normal',     use:'log',    i18n:'namesz'            },
  { key:'plant_type',         data:'Plant_type',         typ:'split',      use:'log',    i18n:'planttype'         },
  { key:'raw_edible_parts_all',data:'Raw_edible_parts_all',typ:'split',   use:'log',    i18n:'rawediblepartsall' },
  { key:'only_prepared_edible_parts_all',data:'Only_prepared_edible_parts_all',typ:'split',use:'log',i18n:'onlypreparedediblepartsall'},
  { key:'toxic_parts_all',    data:'Toxic_parts_all',    typ:'split',      use:'log',    i18n:'toxicpartsall'     },
  { key:'medicinal_parts_all',data:'Medicinal_parts_all',typ:'split',      use:'log',    i18n:'medicinalpartsall' },
  { key:'preparation_all',    data:'Preparation_all',    typ:'split',      use:'fill',   i18n:'preparationall'    },
  { key:'medicinal_use',      data:'Medicinal_use',      typ:'split',      use:'fill',   i18n:'medicinaluse'      },
  { key:'dangers_of_plant',   data:'Dangers_of_plant',   typ:'split',      use:'create', i18n:'dangersofplant'    },
  { key:'uses',               data:'Uses',               typ:'split',      use:'create', i18n:'uses'              },
  { key:'planting_time_under_glass_months',data:'Planting_time_under_glass_months',typ:'normal',use:'log',i18n:'plantingtimeunderglassmonths'},
  { key:'planting_time_in_ground_month',   data:'Planting_time_in_ground_month',   typ:'normal',use:'log',i18n:'plantingtimeingroundmonth'   },
  { key:'occupying_space_month',           data:'Occupying_space_month',           typ:'normal',use:'log',i18n:'occupyingspacemonth'         },
  { key:'flowering_time_month',            data:'Flowering_time_month',            typ:'normal',use:'log',i18n:'floweringtimemonth'          },
  { key:'root_harvesting_time_month',      data:'Root_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'rootharvestingtimemonth'     },
  { key:'stem_harvesting_time_month',      data:'Stem_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'stemharvestingtimemonth'     },
  { key:'leaf_harvesting_time_month',      data:'Leaf_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'leafharvestingtimemonth'     },
  { key:'flower_harvesting_time_month',    data:'Flower_Harvesting_time_month',    typ:'normal',use:'cal', i18n:'flowerharvestingtimemonth'   },
  { key:'fruit_harvesting_time_month',     data:'Fruit_Harvesting_time_month',     typ:'normal',use:'cal', i18n:'fruitharvestingtimemonth'    },
  { key:'seed_harvesting_time_month',      data:'Seed_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'seedharvestingtimemonth'     },
  { key:'bark_harvesting_time_month',      data:'Bark_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'barkharvestingtimemonth'     },
  { key:'pollen_harvesting_time_month',    data:'Pollen_Harvesting_time_month',    typ:'normal',use:'cal', i18n:'pollenharvestingtimemonth'   },
  { key:'wood_harvesting_time_month',      data:'Wood_Harvesting_time_month',      typ:'normal',use:'cal', i18n:'woodharvestingtimemonth'     },
  { key:'apical_bud_harvesting_time_month',data:'Apical_bud_Harvesting_time_month',typ:'normal',use:'cal',i18n:'apicalbudharvestingtimemonth'},
  { key:'seedpod_harvesting_time_month',   data:'Seedpod_Harvesting_time_month',   typ:'normal',use:'cal', i18n:'seedpodharvestingtimemonth'  },
  { key:'manna_harvesting_time_month',     data:'Manna_Harvesting_time_month',     typ:'normal',use:'cal', i18n:'mannaharvestingtimemonth'    },
  { key:'shoot_harvesting_time_month',     data:'Shoot_Harvesting_time_month',     typ:'normal',use:'cal', i18n:'shootharvestingtimemonth'    },
  { key:'nectar_harvesting_time_month',    data:'Nectar_Harvesting_time_month',    typ:'normal',use:'cal', i18n:'nectarharvestingtimemonth'   },
  { key:'sap_harvesting_time_month',       data:'Sap_Harvesting_time_month',       typ:'normal',use:'cal', i18n:'sapharvestingtimemonth'      },
  { key:'harvesting_time_under_glass_month',data:'Harvesting_time_under_glass_months',typ:'normal',use:'cal2',i18n:'harvestingtimeunderglassmonth'},
  { key:'harvesting_time_in_ground_month', data:'Harvesting_time_in_ground_month', typ:'normal',use:'cal2',i18n:'harvestingtimeingroundmonth'  },
  { key:'eating_maturity_time_in_month',   data:'Eating_Maturity_time_in_month',   typ:'normal',use:'cal2',i18n:'eatingmaturitytimeinmonth'    },
  { key:'harvest_storing_month',           data:'Harvest_storing_month',           typ:'normal',use:'cal2',i18n:'harveststoringmonth'          },
  { key:'plant_height_max_mm',             data:'Plant_height_max_mm',             typ:'normal',use:'fill', i18n:'plantheightmax'              },
  { key:'plant_height_average_mm',         data:'Plant_height_average_mm',         typ:'normal',use:'fill', i18n:'plantheightavg'              },
  { key:'plant_width_max_mm',              data:'Plant_width_max_mm',              typ:'normal',use:'fill', i18n:'plantwidthmax'               },
  { key:'plant_width_average_mm',          data:'Plant_width_average_mm',          typ:'normal',use:'fill', i18n:'plantwidthavg'               },
  { key:'plant_root_depth_average_mm',     data:'Plant_root_depth_average_mm',     typ:'normal',use:'fill', i18n:'rootdepthavg'                },
  { key:'plant_root_width_average_mm',     data:'Plant_root_width_average_mm',     typ:'normal',use:'fill', i18n:'rootwidthavg'                },
  { key:'plant_space_filling_mm',          data:'Plant_space_filling_mm',          typ:'normal',use:'create',i18n:'plantspacefilling'          },
  { key:'plant_planting_seed_dept_mm',     data:'Plant_planting_seed_dept_mm',     typ:'splitminus',use:'create',i18n:'plantplantingseeddeptmm'},
  { key:'plant_planting_seed_soil_temperature_celsius',data:'Plant_planting_seed_soil_temperature_celsius',typ:'splitminus',use:'create',i18n:'seedsoiltemperature'},
  { key:'plant_planting_plant_distance_mm',data:'Plant_planting_plant_distance_mm',typ:'splitminus',use:'create',i18n:'plantdistance'          },
  { key:'days_to_germination',             data:'Days_to_Germination',             typ:'splitminus',use:'create',i18n:'daystogermination'       },
  { key:'days_to_maturity',               data:'Days_to_Maturity',                 typ:'splitminus',use:'create',i18n:'daystomaturity'          },
  { key:'days_to_harvest',               data:'Days_to_Harvest',                   typ:'splitminus',use:'create',i18n:'daystoharvest'           },
  { key:'plants_per_square_meter',        data:'Plants_per_square_meter',           typ:'splitminus',use:'create',i18n:'plantsperm2'            },
  { key:'planting_style',                data:'Planting_style',                    typ:'normal',    use:'create',i18n:'plantingstyle'           },
  { key:'cultivation_type',              data:'Cultivation_type',                  typ:'normal',    use:'create',i18n:'cultivationtype'         },
  { key:'plant_growing_lifecycle',       data:'Plant_growing_lifecycle',           typ:'split',     use:'create',i18n:'lifecycle'               },
  { key:'plant_growing_habit',           data:'Plant_growing_habit',               typ:'split',     use:'create',i18n:'growthhabit'             },
  { key:'planting_location',             data:'Planting_location',                 typ:'normal',    use:'create',i18n:'plantinglocation'        },
  { key:'plant_flower_color',            data:'Plant_flower_color',                typ:'normal',    use:'create',i18n:'plantflowercolor'        },
  { key:'leaf_color',                    data:'Leaf_color',                        typ:'split',     use:'create',i18n:'leafcolor'               },
  { key:'hardiness_zone_usda',           data:'Hardiness_Zone_USDA',              typ:'split',     use:'create',i18n:'hardinesszoneusda'        },
  { key:'minimum_temperature',           data:'Minimum_temperature',              typ:'split',     use:'create',i18n:'minimumtemperature'       },
  { key:'plant_description',             data:'Plant_description',                typ:'split',     use:'create',i18n:'plantdescription'         },
  { key:'edible_parts_description',      data:'Edible_parts_description',         typ:'split',     use:'create',i18n:'ediblepartsdescription'   },
  { key:'benefits',                      data:'Benefits',                         typ:'split',     use:'create',i18n:'benefits'                 },
  { key:'needed_polinators',             data:'Needed_polinators',                typ:'split',     use:'create',i18n:'neededpolinators'         },
  { key:'native_range',                  data:'Native_range',                     typ:'split',     use:'create',i18n:'nativerange'              },
  { key:'propagation',                   data:'Propagation',                      typ:'normal',    use:'create',i18n:'propagation'              },
  { key:'plant_seed_survival_time_month',data:'Plant_seed_survival_time_month',   typ:'splitminus',use:'create',i18n:'seedsurvivaltime'         },
  { key:'fruit_length_mm',               data:'Fruit_length_mm',                  typ:'splitminus',use:'create',i18n:'fruitlength'              },
  { key:'fruit_width_mm',                data:'Fruit_width_mm',                   typ:'splitminus',use:'create',i18n:'fruitwidth'               },
  { key:'fruit_weight_mm',               data:'Fruit_weight_mm',                  typ:'splitminus',use:'create',i18n:'fruitweight'              },
  { key:'shade_tolerance',               data:'Shade_tolerance',                  typ:'coded',     use:'create',i18n:'shadetolerance'           },
  { key:'moisture_need',                 data:'Moisture_need',                    typ:'coded',     use:'create',i18n:'moistureneed'             },
  { key:'soil_need',                     data:'Soil_need',                        typ:'coded',     use:'create',i18n:'soilneed'                 },
  { key:'ph_need',                       data:'PH_need',                          typ:'coded',     use:'create',i18n:'phneed'                   },
  { key:'growth_rate',                   data:'Growth_rate',                      typ:'coded',     use:'create',i18n:'growthrate'               },
  { key:'wind_tolerance',                data:'Wind_tolerance',                   typ:'coded',     use:'create',i18n:'windtolerance'            },
  { key:'watering_regime',               data:'Watering_regime',                  typ:'split',     use:'create',i18n:'wateringregime'           },
  { key:'pest_resistance',               data:'Pest_resistance',                  typ:'split',     use:'create',i18n:'pestresistance'           },
  { key:'nitrogen_fixer',                data:'Nitrogen_fixer',                   typ:'split',     use:'create',i18n:'nitrogenfixer'            },
  { key:'plant_root_type',               data:'Plant_root_type',                  typ:'split',     use:'create',i18n:'roottype'                 },
  { key:'foliage_type',                  data:'Foliage_type',                     typ:'split',     use:'create',i18n:'foliagetype'              },
  { key:'flower_type',                   data:'Flower_type',                      typ:'split',     use:'create',i18n:'flowertype'               },
  { key:'storage_duration_month',        data:'Storage_duration_month',           typ:'splitminus',use:'create',i18n:'storageduration'          },
  { key:'yield_per_plant',               data:'Yield_per_plant',                  typ:'splitminus',use:'create',i18n:'yieldperplant'            },
  { key:'companion_plants',              data:'Companion_plants',                 typ:'split',     use:'create',i18n:'companionplants'          },
  { key:'allopatic_effect',              data:'Allopatic_effect',                 typ:'split',     use:'create',i18n:'allopaticeffect'          },
  { key:'allopatic_sensitivity',         data:'Allopatic_sensitivity',            typ:'split',     use:'create',i18n:'allopaticsensitivity'     },
  { key:'allopatic_tolerance',           data:'Allopatic_tolerance',              typ:'split',     use:'create',i18n:'allopatictolerance'       },
  { key:'soil_microbiology',             data:'Soil_microbiology',                typ:'split',     use:'create',i18n:'soilmicrobiology'         },
  { key:'active_in_page',                data:'Active_in_page',                   typ:'normal',    use:'calc',  i18n:'activeinpage'             },
  { key:'active_in_nfc',                 data:'Active_in_NFC',                    typ:'normal',    use:'calc',  i18n:'activeinnfc'              },
  { key:'data_status',                   data:'Data_status',                      typ:'normal',    use:'calc',  i18n:'datastatus'               },
  { key:'source_of_plant',               data:'Source_of_plant',                  typ:'normal',    use:'not',   i18n:'sourceofplant'            },
  { key:'status_datasource',             data:'Status/datasource',                typ:'normal',    use:'not',   i18n:'statusdatasource'         },
  { key:'list_of_varieties',             data:'List_of_varieties',                typ:'split',     use:'not',   i18n:'listofvarieties'          },
  { key:'egyeb',                         data:'Egyéb',                            typ:'normal',    use:'not',   i18n:'egyeb'                    },
];

// ── Field-dependent helpers ──────────────────────────────────────────────
function getMonthColumns() {
  return [
    { field:'Planting_time_under_glass_months',    label:t('planning.plantingCover'),   id:'planting-cover'   },
    { field:'Planting_time_in_ground_month',       label:t('planning.plantingGround'),  id:'planting-ground'  },
    { field:'Harvesting_time_under_glass_months',  label:t('planning.harvestingCover'), id:'harvesting-cover' },
    { field:'Harvesting_time_in_ground_month',     label:t('planning.harvestingGround'),id:'harvesting-ground'},
  ];
}

function getCalender1Tracks() {
  return [
    { id:'planting',       label:t('cal.tracks.planting'),       color:'#2d3436' },
    { id:'flowering',      label:t('cal.tracks.flowering'),      color:'#c8a832' },
    { id:'occupyingSpace', label:t('cal.tracks.occupyingSpace'), color:'#5a8a35' },
    { id:'harvestMaturity',label:t('cal.tracks.harvestMaturity'),color:'#e07b20' },
    { id:'harvesting',     label:t('cal.tracks.harvesting'),     color:'#1aab98' },
    { id:'eatingMaturity', label:t('cal.tracks.eatingMaturity'), color:'#c0392b' },
    { id:'harvestStoring', label:t('cal.tracks.harvestStoring'), color:'#c8a060' },
    { id:'seedSaving',     label:t('cal.tracks.seedSaving'),     color:'#2054bb' },
  ];
}

// ── Pure utilities ───────────────────────────────────────────────────────
function normalizeName(name) {
  return name.toLowerCase().replaceAll(' ','_');
}

function buildSearchText(value, useSplit = false) {
  const raw = value ?? '';
  if (useSplit && typeof raw === 'string') {
    return splitPipe(raw).filter(Boolean).map(v => String(v).trim()).join(', ').toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

// ── SVG helpers ──────────────────────────────────────────────────────────
function readSvgPixelSize(svgElement) {
  const wA = Number.parseFloat(svgElement.getAttribute('width'));
  const hA = Number.parseFloat(svgElement.getAttribute('height'));
  if (Number.isFinite(wA) && Number.isFinite(hA)) return { width: wA, height: hA };
  const vb = svgElement.viewBox?.baseVal;
  if (vb?.width > 0 && vb?.height > 0) return { width: vb.width, height: vb.height };
  const cs = window.getComputedStyle(svgElement);
  const wC = Number.parseFloat(cs.width);
  const hC = Number.parseFloat(cs.height);
  if (Number.isFinite(wC) && Number.isFinite(hC)) return { width: wC, height: hC };
  throw new Error('Unable to detect SVG dimensions.');
}

function makePartSvgIcon(term, id = null, type = 'display:inline-block') {
  const def = PART_ICON_MAP[term];
  if (!def) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  console.log('make svg from: ' + def.symbolid);
  const sourceSvg = document.getElementById(def.symbolid);
  if (!sourceSvg) { console.log('not found: ' + def.symbolid); return null; }
  const vb = sourceSvg.getAttribute('viewBox');
  const ow = sourceSvg.getAttribute('width');
  const oh = sourceSvg.getAttribute('height');
  if (vb)            svg.setAttribute('viewBox', vb);
  else if (ow && oh) svg.setAttribute('viewBox', `0 0 ${ow} ${oh}`);
  else               svg.setAttribute('viewBox', '0 0 512 512');
  svg.setAttribute('class', def.class);
  svg.style.cssText = type;
  if (id) svg.setAttribute('id', `${term}-${id}`);
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', def.symbol);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', def.symbol);
  svg.appendChild(use);
  return svg;
}

// ── Identity filter links ────────────────────────────────────────────────
function setIdentityFilterLink(element, filterType, value) {
  if (!element) return;
  element.textContent = ' / ';
  const cleaned = String(value || '').trim();
  if (!cleaned) return;
  const link = document.createElement('a');
  link.href = `PlantListPage.html?filterType=${encodeURIComponent(filterType)}&filterValue=${encodeURIComponent(cleaned)}`;
  link.textContent = cleaned;
  element.appendChild(link);
}

// ── Calendar helpers ─────────────────────────────────────────────────────
function uniqueCALENDER1Slots(...values) {
  const slots = new Set();
  splitPipe(values.join('|')).forEach(token => {
    const match = token.match(/^(\d{1,2})(?:\.(\d))?$/);
    if (!match) return;
    const month = Number.parseInt(match[1], 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) return;
    if (match[2] === undefined) {
      for (let w = 1; w <= 4; w++) slots.add(`${month}-${w}`);
    } else {
      const week = Number.parseInt(match[2], 10);
      if (Number.isInteger(week) && week >= 1 && week <= 4) slots.add(`${month}-${week}`);
    }
  });
  return slots;
}

function renderCALENDER1(plant, FM) {
  const root = document.querySelector('#CALENDER1');
  if (!root) return;

  const data = {
    planting:       uniqueCALENDER1Slots(plant[FM.planting_time_under_glass_months], plant[FM.planting_time_in_ground_month]),
    occupyingSpace: uniqueCALENDER1Slots(plant[FM.occupying_space_month]),
    flowering:      uniqueCALENDER1Slots(plant[FM.flowering_time_month]),
    harvestMaturity:uniqueCALENDER1Slots(plant[FM.fruit_harvesting_time_month]),
    eatingMaturity: uniqueCALENDER1Slots(plant[FM.eating_maturity_time_in_month]),
    harvesting:     uniqueCALENDER1Slots(
      plant[FM.sap_harvesting_time_month],    plant[FM.nectar_harvesting_time_month],
      plant[FM.shoot_harvesting_time_month],  plant[FM.seedpod_harvesting_time_month],
      plant[FM.apical_bud_harvesting_time_month], plant[FM.wood_harvesting_time_month],
      plant[FM.pollen_harvesting_time_month], plant[FM.bark_harvesting_time_month],
      plant[FM.leaf_harvesting_time_month],   plant[FM.stem_harvesting_time_month],
      plant[FM.flower_harvesting_time_month], plant[FM.fruit_harvesting_time_month],
      plant[FM.seed_harvesting_time_month],   plant[FM.root_harvesting_time_month]
    ),
    harvestStoring: uniqueCALENDER1Slots(plant[FM.harvest_storing_month]),
    seedSaving:     uniqueCALENDER1Slots(plant[FM.seed_harvesting_time_month]),
  };

  const tracks      = getCalender1Tracks();
  const monthLabels = t('cal.months');
  const frag        = document.createDocumentFragment();

  // Scroll wrapper
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'cal-scroll-wrapper';
  const inner = document.createElement('div');
  inner.className = 'cal-inner';

  // Month header
  const header = document.createElement('div');
  header.className = 'CALENDER1-months';
  monthLabels.forEach(lbl => {
    const cell = document.createElement('div');
    cell.className = 'CALENDER1-month';
    cell.textContent = lbl;
    header.appendChild(cell);
  });
  inner.appendChild(header);

  // Track rows
  const tracksEl = document.createElement('div');
  tracksEl.className = 'CALENDER1-tracks';

  tracks.forEach(track => {
    const activeSlots = data[track.id] || new Set();
    const row = document.createElement('div');
    row.className = 'cal-track-row';

    for (let month = 1; month <= 12; month++) {
      const group = document.createElement('div');
      group.className = 'cal-month-group';
      for (let week = 1; week <= 4; week++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        if (activeSlots.has(`${month}-${week}`)) {
          cell.classList.add('active');
          cell.style.setProperty('--track-color', track.color);
        }
        group.appendChild(cell);
      }
      row.appendChild(group);
    }
    tracksEl.appendChild(row);
  });

  inner.appendChild(tracksEl);
  scrollWrap.appendChild(inner);
  frag.appendChild(scrollWrap);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'cal-legend';
  tracks.forEach(track => {
    const item = document.createElement('div');
    item.className = 'cal-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'cal-swatch';
    swatch.style.background = track.color;
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(track.label));
    legend.appendChild(item);
  });
  frag.appendChild(legend);

  root.innerHTML = '';
  root.appendChild(frag);
}

// ── Planning table ───────────────────────────────────────────────────────
function populatePlanningTable(plant) {
  const tbody = document.querySelector('#planning-table-body');
  const frag  = document.createDocumentFragment();

  getMonthColumns().forEach(({ field, label, id }, rowIndex) => {
    const months = new Set(monthsFromValue(plant[field] || ''));
    const row    = document.createElement('tr');
    if (id) row.setAttribute('data-row-id', id);
    const th = document.createElement('td');
    th.textContent = label;
    row.appendChild(th);
    for (let month = 1; month <= 12; month++) {
      const cell = document.createElement('td');
      if (months.has(month)) {
        cell.style.backgroundColor = ROW_COLORS[rowIndex % ROW_COLORS.length];
        cell.textContent = '●';
      }
      row.appendChild(cell);
    }
    frag.appendChild(row);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

// ── Edibility state ──────────────────────────────────────────────────────
let edibleText         = '';
let ediblePreparedText = '';
let toxicText          = '';
let medicinalText      = '';

function edibilityClass(term) {
  const t2 = term.toLowerCase();
  if (toxicText.includes(t2))          return 'red';
  if (ediblePreparedText.includes(t2)) return 'yellow';
  if (edibleText.includes(t2))         return 'green';
  return 'black';
}

function applyIconColours() {
  PARTS.forEach(part => {
    const cls = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove('green','red','black','yellow');
      svg.classList.add(cls);
    });
  });
  return edibilityClass;
}

// ── Harvest icons in planning table ─────────────────────────────────────
function insertPartIconsInTable(plant) {
  const rows      = Array.from(document.querySelectorAll('#planning-table-body tr'));
  const targetRow = rows.find(r => r.getAttribute('data-row-id') === 'harvesting-ground');
  if (!targetRow) { console.warn('planning table missing "harvesting-ground" row'); return; }

  HARVEST_PART_COLUMNS.forEach(({ key, term }) => {
    if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
    const months = monthsFromValue(plant[key] || '');
    if (!months.length) return;
    months.forEach(month => {
      if (typeof month !== 'number' || month < 1 || month > 12) return;
      const cells = targetRow.querySelectorAll('td');
      const cell  = cells[month];
      if (!cell) return;
      if (!cell.querySelector('svg')) cell.textContent = '';
      const svg = makePartSvgIcon(term, `harv-icon-${month}`, 'display:inline-block');
      if (svg) cell.appendChild(svg);
    });
  });

  PARTS.forEach(part => {
    const cls = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove('green','red','black','yellow');
      svg.classList.add(cls);
    });
  });
}

// ── Category icons row ───────────────────────────────────────────────────
function insertCategoryIconsRow(plant, mode, vers) {
  const containerName = `#part-icons-row-${vers}`;
  const container = document.querySelector(containerName);
  if (!container) { console.warn(`Missing ${containerName} container`); return; }

  const frag = document.createDocumentFragment();
  let iconsMade = 0;

  if (mode === 'unique') {
    const seenParts = new Set();
    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;
      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => seenParts.add(part));
    });
    seenParts.forEach(part => {
      const svg = makePartSvgIcon(part, `${vers}-icon`, 'display:inline-block');
      if (svg) { frag.appendChild(svg); iconsMade++; }
    });
  } else {
    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;
      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => {
          const svg = makePartSvgIcon(part, `${vers}-icon-${key}`, 'display:inline-block');
          if (svg) { frag.appendChild(svg); iconsMade++; }
        });
    });
  }

  if (iconsMade === 0) {
    const svg = makePartSvgIcon('none', `none-${vers}-icon`, 'display:inline-block');
    if (svg) frag.appendChild(svg);
  }

  PARTS.forEach(part => {
    const cls = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove('green','red','black','yellow');
      svg.classList.add(cls);
    });
  });

  container.innerHTML = '';
  container.appendChild(frag);
}

// ── Size icons ───────────────────────────────────────────────────────────
async function applySizeIcons(plant, FM) {
  const type = splitPipe(plant[FM.plant_type]).join(', ');

  const humanSvg  = document.getElementById('size-human-icon-1');
  const treeSvg   = document.getElementById('size-tree-icon-2');
  const bushSvg   = document.getElementById('size-bush-icon-1');
  const plantSvg  = document.getElementById('size-plant-icon-1');
  const houseSvg  = document.getElementById('size-house-icon-1');
  const rootSvg   = document.getElementById('size-root-icon-1');
  const root2Svg   = document.getElementById('size-root-icon-2');
   const root3Svg   = document.getElementById('size-root-icon-3');

  if (!humanSvg) { console.warn('Human icon missing'); return; }

  // Scale: human icon is 66px tall = 1800mm real world  8 22
  const HUMAN_PX_H  = 66;  // width = 7.21 ; height = 21.9
  const HUMAN_MM_H  = 1800;
  const pxPerMm     = HUMAN_PX_H / HUMAN_MM_H;

  const plantWmm = Number(plant[FM.plant_width_max_mm])          || 1000;
  const plantHmm = Number(plant[FM.plant_height_max_mm])         || 1000;
  const rootWmm  = Number(plant[FM.plant_root_width_average_mm]) || 500;
  const rootHmm  = Number(plant[FM.plant_root_depth_average_mm]) || 500;
  const HOUSE_W_MM = 6000;
  const HOUSE_H_MM = 4000;

  // Fix viewBox to tight content bounds so no invisible whitespace gaps
  function fixViewBox(svgEl) {
    if (!svgEl) return;
    const prevDisplay = svgEl.style.display;
    const prevVis     = svgEl.style.visibility;
    svgEl.style.display    = 'block';
    svgEl.style.visibility = 'hidden';
    try {
      const useEl = svgEl.querySelector('use');
      if (!useEl) return;
      const bbox = useEl.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 2;
        svgEl.setAttribute('viewBox',
          `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
      }
    } catch (e) { console.warn(`fixViewBox failed for ${svgEl.id}:`, e); }
    svgEl.style.display    = prevDisplay;
    svgEl.style.visibility = prevVis;
  }

  [treeSvg, bushSvg, plantSvg, rootSvg, houseSvg].forEach(fixViewBox);

  // Scale an icon to match real-world mm dimensions, preserving its aspect ratio
  // Returns the final pixel width so callers can match it.
  function scaleIcon(svgEl, realWmm, realHmm) {
    if (!svgEl) return 0;
    const tW = realWmm * pxPerMm;
    const tH = realHmm * pxPerMm;
    const vb = svgEl.viewBox?.baseVal;
    let fW, fH;
    if (vb && vb.width > 0 && vb.height > 0) {
      const iA = vb.width / vb.height;
      const tA = tW / tH;
      if (iA > tA) { fW = tW; fH = tW / iA; }
      else          { fH = tH; fW = tH * iA; }
    } else {
      fW = tW; fH = tH;
    }
    svgEl.style.width  = `${fW}px`;
    svgEl.style.height = `${fH}px`;
    console.log(`${svgEl.id}: ${fW.toFixed(1)}×${fH.toFixed(1)}px  (real: ${realWmm}×${realHmm}mm)`);
    return fW;
  }

  // Scale reference icons
  scaleIcon(houseSvg, HOUSE_W_MM, HOUSE_H_MM);

  // Decide which above-ground icon to show
  [treeSvg, bushSvg, plantSvg].forEach(s => { if (s) s.style.display = 'none'; });
  let activePlantSvg = plantSvg;
  if      (type.includes('Tree')) activePlantSvg = treeSvg;
  else if (type.includes('Bush')) activePlantSvg = bushSvg;
  if (activePlantSvg) activePlantSvg.style.display = 'block';

  // Scale the active above-ground icon; get its rendered pixel width
  const aboveGroundPxW = scaleIcon(activePlantSvg, plantWmm, plantHmm);

  // ── Root: scale by its own real dimensions, then FORCE its width to match
  //   the above-ground icon so they look visually connected and centred.
  // ── We keep the root's aspect ratio for height but override width.
  if (rootSvg) {
    const rootTargetH = rootHmm * pxPerMm;
     const rootTargetW = rootWmm * pxPerMm;
    const vbR = rootSvg.viewBox?.baseVal;
    let rootFinalH = rootTargetH;
    let rootFinalW = aboveGroundPxW; // match the above-ground plant width
    let placeHFinalW = 2; // match the above-ground plant width
/*
    if (vbR && vbR.width > 0 && vbR.height > 0) {
      // Compute natural height from the root's own aspect at the matched width
      const rootNaturalH = aboveGroundPxW / (vbR.width / vbR.height);
      // Use whichever is smaller: scaled-by-data height or natural height
      rootFinalH = Math.min(rootTargetH, rootNaturalH, 120); // cap at 120px
    }*/

    rootSvg.style.width  = `${rootFinalW}px`;
    rootSvg.style.height = `${rootFinalH}px`;
    rootSvg.style.display = 'block';
    console.log(`root: ${rootFinalW.toFixed(1)}×${rootFinalH.toFixed(1)}px`);
    root2Svg.style.width  = `${placeHFinalW}px`;
    root2Svg.style.height = `${rootFinalH}px`;
    root2Svg.style.display = 'block';
    root3Svg.style.width  = `${placeHFinalW}px`;
    root3Svg.style.height = `${rootFinalH}px`;
    root3Svg.style.display = 'block';
  }

  // Human stays at its fixed pixel reference size // width = 7.21 ; height = 21.9
  humanSvg.style.width  = `${HUMAN_PX_H * (10 / 22)}px`;
  humanSvg.style.height = `${HUMAN_PX_H}px`;
}

// ── Image carousel ────────────────────────────────────────────────────────
// State
let _carouselImages  = [];   // [{src, name}]
let _carouselIndex   = 0;

function carouselRender() {
  const imgEl       = document.getElementById('plantImg');
  const nameEl      = document.getElementById('carousel-name');
  const counterEl   = document.getElementById('carousel-counter');
  const prevBtn     = document.getElementById('carousel-prev');
  const nextBtn     = document.getElementById('carousel-next');
  const dotsEl      = document.getElementById('carousel-dots');
  const placeholder = document.getElementById('carousel-placeholder');

  const total = _carouselImages.length;

  if (!total) {
    if (imgEl)        { imgEl.style.display = 'none'; }
    if (placeholder)  { placeholder.style.display = 'flex'; }
    if (nameEl)       nameEl.textContent = 'No image available';
    if (counterEl)    counterEl.textContent = '';
    if (prevBtn)      prevBtn.style.display = 'none';
    if (nextBtn)      nextBtn.style.display = 'none';
    if (dotsEl)       dotsEl.innerHTML = '';
    return;
  }

  const current = _carouselImages[_carouselIndex];

  // Image
  if (imgEl) {
    imgEl.style.display = 'block';
    imgEl.style.opacity = '0';
    imgEl.src = current.src;
    imgEl.onload = () => { imgEl.style.opacity = '1'; };
    imgEl.onerror = () => {
      imgEl.style.opacity = '1';
      imgEl.alt = 'Image not found';
    };
  }
  if (placeholder) placeholder.style.display = 'none';

  // Caption
  if (nameEl)    nameEl.textContent    = current.name || '–';
  if (counterEl) counterEl.textContent = total > 1 ? `${_carouselIndex + 1} / ${total}` : '';

  // Buttons
  if (prevBtn) {
    prevBtn.style.display = total > 1 ? 'flex' : 'none';
    prevBtn.disabled = _carouselIndex === 0;
  }
  if (nextBtn) {
    nextBtn.style.display = total > 1 ? 'flex' : 'none';
    nextBtn.disabled = _carouselIndex === total - 1;
  }

  // Dots
  if (dotsEl) {
    if (total <= 1) {
      dotsEl.innerHTML = '';
      dotsEl.classList.add('single');
    } else {
      dotsEl.classList.remove('single');
      dotsEl.innerHTML = '';
      _carouselImages.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === _carouselIndex ? ' active' : '');
        dot.setAttribute('aria-label', `Image ${i + 1}`);
        dot.addEventListener('click', () => { _carouselIndex = i; carouselRender(); });
        dotsEl.appendChild(dot);
      });
    }
  }
}

function carouselInit() {
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (_carouselIndex > 0) { _carouselIndex--; carouselRender(); }
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (_carouselIndex < _carouselImages.length - 1) { _carouselIndex++; carouselRender(); }
  });
  // Keyboard navigation when carousel is focused
  document.addEventListener('keydown', e => {
    const carousel = document.getElementById('plant-carousel');
    if (!carousel) return;
    if (e.key === 'ArrowLeft')  { if (_carouselIndex > 0) { _carouselIndex--; carouselRender(); } }
    if (e.key === 'ArrowRight') { if (_carouselIndex < _carouselImages.length - 1) { _carouselIndex++; carouselRender(); } }
  });
}

// Extract a clean display name from a filename or URL
function extractImageName(src) {
  try {
    // Get last path segment, strip extension and underscores
    const seg = decodeURIComponent(src.split('/').pop().split('?')[0]);
    return seg.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  } catch {
    return src;
  }
}

/*
async function loadPlantImage(plant) {
  carouselInit();

  const searchLatin   = (plant.LatinName   || '').trim().replace(/\s+/g, '_');
  const searchVariety = (plant.Name_Variety || '').trim().replace(/\s+/g, '_');
  const imgText  = `${searchLatin}_${searchVariety}`;
  const searchId = normalizeName(imgText);
  console.log('search image norm text: ' + searchId);
  
  _carouselImages = [];
  _carouselIndex  = 0;

    try {
    // 1. Try local images.json — may contain multiple files per plant
    const response = await fetch('images/images.json');
    const data = await response.json();
    
    // Try keys in priority order:
    //   a) numeric Plant_ID (matches files named {Plant_ID}_*.jpg generated by generateImagesJson.js)
    //   b) latin_variety   (e.g. "malus_domestica_species")
    //   c) latin only      (e.g. "malus_domestica" — legacy hand-crafted images.json entries)
    const plantId   = String(plant.Plant_ID || '');
    const latinOnly = normalizeName(searchLatin);
    const key = (plantId && data[plantId]?.length)  ? plantId
              : (data[searchId]?.length)             ? searchId
              : (data[latinOnly]?.length)            ? latinOnly
              : null;
    console.log(`look in:`+key);
    if (key) {
      _carouselImages = data[key].map(filename => ({
        src:  `images/${filename}`,
        name: extractImageName(filename),
      }));
      console.log(`found ${_carouselImages.length} local image(s) for key "${key}"`);
      carouselRender();
      return;
    }
  } catch (err) {
    console.warn('images.json not available or parse error:', err);
  }

  // 2. Fallback to Wikipedia
  try {
    const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${searchLatin}`);
    if (!wikiResponse.ok) throw new Error('Wiki fetch failed');
    const wikiData = await wikiResponse.json();

    const src = wikiData.thumbnail?.source || wikiData.originalimage?.source || null;
    if (src) {
      _carouselImages = [{ src, name: extractImageName(src) }];
      carouselRender();
      return;
    }
  } catch (err) {
    console.warn('Wikipedia image fetch failed:', err);
  }

  // 3. Default placeholder
  _carouselImages = [{ src: 'images/default.jpg', name: 'Default image' }];
  carouselRender();
}*/

// ── syncViewBoxes ────────────────────────────────────────────────────────
async function syncViewBoxes() {
  const container = document.getElementById('icon-container');
  const svgs = container.querySelectorAll('svg');
  for (const svg of svgs) {
    const useTag  = svg.querySelector('use');
    const fileUrl = useTag.getAttribute('href');
    try {
      const response = await fetch(fileUrl);
      const text     = await response.text();
      const w = text.match(/width=["']([^"']+)["']/);
      const h = text.match(/height=["']([^"']+)["']/);
      const wVal = w ? parseFloat(w[1]) : NaN;
      const hVal = h ? parseFloat(h[1]) : NaN;
      if (!isNaN(wVal) && wVal > 0 && !isNaN(hVal) && hVal > 0) {
        svg.setAttribute('viewBox', `0 0 ${wVal} ${hVal}`);
      } else {
        const vbMatch = text.match(/viewBox=["']([^"']+)["']/);
        if (vbMatch) svg.setAttribute('viewBox', vbMatch[1]);
      }
    } catch (err) {
      console.error(`Could not sync viewBox for ${fileUrl}:`, err);
    }
  }
}

// ── Code decoder ─────────────────────────────────────────────────────────
function getCodeValue(key, value) {
  if (!value || !T_CODE_MAP[key]) return value || '';
  return value.split('|').map(v => T_CODE_MAP[key][v] || v).join(', ');
}

// ── Field renderer ───────────────────────────────────────────────────────
function renderFields(containerId, map, plant) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const formatValue = (value, type, key) => {
    if (!value) return '';
    switch (type) {
      case 'coded':     return getCodeValue(key, value);
      case 'split':     return splitPipe(value).join(', ');
      case 'splitminus':return splitPipe(value).join(' – ');
      default:          return value;
    }
  };

  const VISIBLE = new Set(['show','fill','create']);
  map.filter(item => VISIBLE.has(item.use)).forEach(item => {
    if (item.use === 'fill') {
      const rawVal = plant[item.data];
      const fmtVal = formatValue(rawVal, item.typ, item.key);
      const input  = document.querySelector(`#${item.key}`);
      if (input) input.value = fmtVal || '';
    } else if (item.use === 'create') {
      const rawVal = plant[item.data];
      const fmtVal = formatValue(rawVal, item.typ, item.key);
      const card   = document.createElement('div');
      card.className = 'field-card';
      const label  = document.createElement('span');
      label.className = 'field-card__label';
      label.setAttribute('data-i18n', `detail.label.${item.i18n}`);
      label.textContent = t(`detail.label.${item.i18n}`);
      const value  = document.createElement('span');
      value.className = 'field-card__value' + (fmtVal ? '' : ' field-card__value--empty');
      value.id = item.key;
      value.textContent = fmtVal || '–';
      card.appendChild(label);
      card.appendChild(value);
      container.appendChild(card);
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
//  MAIN INIT
// ════════════════════════════════════════════════════════════════════════
const selectedNr = localStorage.getItem('selectedPlantNr');
const urlParams  = new URLSearchParams(window.location.search);
const urlPlantId = urlParams.get('id');

document.querySelector('#back-button').addEventListener('click', () => {
  window.location.href = 'Homepage.html';
});

(async function init() {
  setupLanguageButtons();
  await syncViewBoxes();

  const title             = document.querySelector('#primary-title');
  const subtitle          = document.querySelector('#secondary-title');
  const identityfamily    = document.querySelector('#identity-family');
  const identitygenus     = document.querySelector('#identity-genus');
  const identitylatinName = document.querySelector('#identity-latinName');
  const identityvariety   = document.querySelector('#identity-variety');

  if (!selectedNr && !urlPlantId) {
    title.textContent    = t('detail.noPlantSelected');
    subtitle.textContent = t('detail.noPlantSelectedMsg');
    return;
  }

  try {
    const lookupNr = urlPlantId || selectedNr;
    const { plant, varieties } = await loadPlantIdWithVarieties(lookupNr);

    if (!plant) {
      title.textContent    = t('detail.plantNotFound');
      subtitle.textContent = t('detail.plantNotFoundMsg');
      return;
    }

    // Build FM lookup once
    const FM = Object.fromEntries(BASIC_FIED_MAP.map(f => [f.key, f.data]));
    console.log('cache ready');
    console.log('example data, plant width av: ' + plant[FM.plant_width_average_mm]);

    // Title & identity
    const lang          = getCurrentLang();
    const primaryName   = lang === 'en'
      ? (plant.Name_EN || plant.Name_HU || 'Unknown')
      : (plant.Name_HU || plant.Name_EN || 'Unknown');
    const secondaryName = lang === 'en'
      ? (plant.Name_HU || '')
      : (plant.Name_EN || '');

    title.textContent    = secondaryName ? `${primaryName}   |   ${secondaryName}` : primaryName;
    subtitle.textContent = plant.Name_Variety || 'Unknown';

    setIdentityFilterLink(identityfamily,    'family', plant.Family);
    setIdentityFilterLink(identitygenus,     'genus',  plant.Genus);
    setIdentityFilterLink(identitylatinName, 'latin',  plant.LatinName);
    if (identityvariety) identityvariety.innerHTML = `<strong> / ${plant.Name_Variety || ''}</strong>`;

    // Data status message
    const message1 = document.getElementById('data_status');
    if (plant.Data_status === 'No') {
      message1.textContent = 'Database not yet filled!';
      message1.style.display = 'inline-block';
      console.log('data not ready. plant.Data_status= ' + plant.Data_status);
    } else {
      message1.style.display = 'none';
      console.log('data ready. plant.Data_status= ' + plant.Data_status);
    }

    // Build search texts
    edibleText         = buildSearchText(plant.Raw_edible_parts_all,      true);
    ediblePreparedText = buildSearchText(plant.Prepared_edible_parts_all, true);
    toxicText          = buildSearchText(plant.Toxic_parts_all,           true);
    medicinalText      = buildSearchText(plant.Medicinal_parts_all,       true);

    // Form fields
    renderFields('fields1', BASIC_FIED_MAP, plant);

    // NFC link
    const nfcEl = document.querySelector('#nfc-link');
    if (nfcEl) nfcEl.textContent = `${plant.Plant_ID}  / ${primaryName} / ${plant.Name_Variety || ''} / ${plant.LatinName || ''} / ${window.location.href}`;

    // Planning table + calendar
    populatePlanningTable(plant);
    renderCALENDER1(plant, FM);

    // Varieties list
    const varietiesList = document.querySelector('#varieties-list');
    if (varietiesList) {
      varietiesList.innerHTML = varieties.length
        ? varieties.map(v => `<li><a href="P.html?id=${v.Plant_ID}">${v.Name_Variety}</a></li>`).join('')
        : `<li>${t('detail.noVarieties')}</li>`;
    }

    // Icon colouring
    applyIconColours();

    // Harvest icons in table + category icon rows
    insertPartIconsInTable(plant);
    insertCategoryIconsRow(plant, 'unique', 'harv');
    insertCategoryIconsRow(plant, 'unique', 'med');

    // Size icons
    applySizeIcons(plant, FM);

    // Image (non-blocking)
    //loadPlantImage(plant);
    loadPlantImage(plant.LatinName, plant.Name_Variety) ;

    applyTranslations();

  } catch (error) {
    console.error('Error loading plant data:', error);
    document.querySelector('#primary-title').textContent = t('detail.error.loadPlant');
  }
})();
