import { loadPlantIdWithVarieties, splitPipe, monthsFromValue } from "./csv-utils.js";
import { t, getCurrentLang, applyTranslations, setupLanguageButtons } from "./lang.js";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BASE_REAL_SIZE_MM = { width: 845, height: 1800 };

const ROW_COLORS = [
  '#F7E6A4', '#F7E6A4', '#F7B0A1', '#A4F7A4',
  '#F7E6A4', '#F7E6A4', '#A4F7DA', '#F7E6A4',
];

const PARTS = [
  "root", "shoot", "stem", "wood", "sap", "apicalbud",
  "bark", "leaf", "flower", "nectar", "pollen", "fruit", "seedpod", "seed"
];

const PART_ICON_MAP = {
  leaf:     { class: 'leaf-harvest-icon',     symbol: '#icon-leaf',     symbolid: 'icon-leaf'},
  stem:     { class: 'stem-harvest-icon',     symbol: '#icon-stem',     symbolid: 'icon-stem'     },
  flower:   { class: 'flower-harvest-icon',   symbol: '#icon-flower',   symbolid: 'icon-flower'   },
  fruit:    { class: 'fruit-harvest-icon',    symbol: '#icon-fruit',    symbolid: 'icon-fruit'    },
  seed:     { class: 'seed-harvest-icon',     symbol: '#icon-seed',     symbolid: 'icon-seed'     },
  root:     { class: 'root-harvest-icon',     symbol: '#icon-root',     symbolid: 'icon-root'     },
  shoot:    { class: 'shoot-harvest-icon',    symbol: '#icon-shoot',    symbolid: 'icon-shoot'    },
  wood:     { class: 'wood-harvest-icon',     symbol: '#icon-wood',     symbolid: 'icon-wood'     },
  sap:      { class: 'sap-harvest-icon',      symbol: '#icon-sap',      symbolid: 'icon-sap'      },
  apicalbud:{ class: 'apicalbud-harvest-icon',symbol: '#icon-apicalbud',symbolid: 'icon-apicalbud'},
  bark:     { class: 'bark-harvest-icon',     symbol: '#icon-bark',     symbolid: 'icon-bark'     },
  nectar:   { class: 'nectar-harvest-icon',   symbol: '#icon-nectar',   symbolid: 'icon-nectar'   },
  pollen:   { class: 'pollen-harvest-icon',   symbol: '#icon-pollen',   symbolid: 'icon-pollen'   },
  seedpod:  { class: 'seedpod-harvest-icon',  symbol: '#icon-seedpod',  symbolid: 'icon-seedpod'  },
  none:  { class: 'none-harvest-icon',  symbol: '#icon-none',  symbolid: 'icon-none'  },
};

const T_CODE_MAP = {
  shade_tolerance: { F: 'full shade', S: 'semi-shade', N: 'no shade' },
  moisture_need: { D: 'dry',  M: 'moist', We: 'wet', Wa: 'water'},
  soil_need: { L: 'light (sandy)',M: 'medium', H: 'heavy (clay)' },
  ph_need: { A: 'acid',  N: 'neutral',  B: 'basic (alkaline)' },
  growth_rate: { S: 'slow', M: 'medium', F: 'fast' },
  wind_tolerance: { L: 'low', M: 'moderate', H: 'high'}
};

// CSV column → part term mapping for the planning table harvest row
const HARVEST_PART_COLUMNS = [
  { key: 'Leaf_Harvesting_time_month',      term: 'leaf'      },
  { key: 'Stem_Harvesting_time_month',      term: 'stem'      },
  { key: 'Flower_Harvesting_time_month',    term: 'flower'    },
  { key: 'Fruit_Harvesting_time_month',     term: 'fruit'     },
  { key: 'Seed_Harvesting_time_month',      term: 'seed'      },
  { key: 'Root_Harvesting_time_month',      term: 'root'      },
  { key: 'Shoot_Harvesting_time_month',     term: 'shoot'     },
  { key: 'Wood_Harvesting_time_month',      term: 'wood'      },
  { key: 'Sap_Harvesting_time_month',       term: 'sap'       },
  { key: 'Apical_bud_Harvesting_time_month',term: 'apicalbud' },
  { key: 'Bark_Harvesting_time_month',      term: 'bark'      },
  { key: 'Nectar_Harvesting_time_month',    term: 'nectar'    },
  { key: 'Pollen_Harvesting_time_month',    term: 'pollen'    },
  { key: 'Seedpod_Harvesting_time_month',   term: 'seedpod'   },
];

const BASIC_FIED_MAP = [
  { key:'latin_name', symbol:"#latin_name", data:"LatinName", icon:"", typ:'normal', use:"log", i18n:"latinname" },
  { key:'name_variety', symbol:"#name_variety", data:"Name_Variety", icon:"", typ:'normal', use:"log", i18n:"namevariety" },
  { key:'name_hu', symbol:"#name_hu", data:"Name_HU", icon:"", typ:'normal', use:"log", i18n:"namehu" },
  { key:'name_en', symbol:"#name_en", data:"Name_EN", icon:"", typ:'normal', use:"log", i18n:"nameen" },
  { key:'genus', symbol:"#genus", data:"Genus", icon:"", typ:'normal', use:"log", i18n:"genus" },
  { key:'family', symbol:"#family", data:"Family", icon:"", typ:'normal', use:"log", i18n:"family" },
  { key:'name_sz', symbol:"#name_sz", data:"Name_SZ", icon:"", typ:'normal', use:"log", i18n:"namesz" },

  { key:'plant_type', symbol:"#plant_type", data:"Plant_type", icon:"", typ:'split', use:"log", i18n:"planttype" },

  { key:'raw_edible_parts_all', symbol:"#raw_edible_parts_all", data:"Raw_edible_parts_all", icon:"", typ:'split', use:"log", i18n:"rawediblepartsall" },
  { key:'only_prepared_edible_parts_all', symbol:"#only_prepared_edible_parts_all", data:"Only_prepared_edible_parts_all", icon:"log", typ:'split', use:"", i18n:"onlypreparedediblepartsall" },
  { key:'toxic_parts_all', symbol:"#toxic_parts_all", data:"Toxic_parts_all", icon:"", typ:'split', use:"log", i18n:"toxicpartsall" },
  { key:'medicinal_parts_all', symbol:"#medicinal_parts_all", data:"Medicinal_parts_all", icon:"", typ:'split', use:"log", i18n:"medicinalpartsall" },

  { key:'preparation_all', symbol:"#preparation_all", data:"Preparation_all", icon:"", typ:'split', use:"fill", i18n:"preparationall" },
  { key:'medicinal_use', symbol:"#medicinal_use", data:"Medicinal_use", icon:"", typ:'split', use:"fill", i18n:"medicinaluse" },
  { key:'dangers_of_plant', symbol:"#dangers_of_plant", data:"Dangers_of_plant", icon:"", typ:'split', use:"create", i18n:"dangersofplant" },
  { key:'uses', symbol:"#uses", data:"Uses", icon:"", typ:'split', use:"create", i18n:"uses" },

  { key:'planting_time_under_glass_months', symbol:"#planting_time_under_glass_months", data:"Planting_time_under_glass_months", icon:"", typ:'normal', use:"log", i18n:"plantingtimeunderglassmonths" },
  { key:'planting_time_in_ground_month', symbol:"#planting_time_in_ground_month", data:"Planting_time_in_ground_month", icon:"", typ:'normal', use:"log", i18n:"plantingtimeingroundmonth" },
  { key:'occupying_space_month', symbol:"#occupying_space_month", data:"Occupying_space_month", icon:"", typ:'normal', use:"log", i18n:"occupyingspacemonth" },
  { key:'flowering_time_month', symbol:"#flowering_time_month", data:"Flowering_time_month", icon:"", typ:'normal', use:"log", i18n:"floweringtimemonth" },

  { key:'root_harvesting_time_month', symbol:"#root_harvesting_time_month", data:"Root_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"rootharvestingtimemonth" },
  { key:'stem_harvesting_time_month', symbol:"#stem_harvesting_time_month", data:"Stem_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"stemharvestingtimemonth" },
  { key:'leaf_harvesting_time_month', symbol:"#leaf_harvesting_time_month", data:"Leaf_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"leafharvestingtimemonth" },
  { key:'flower_harvesting_time_month', symbol:"#flower_harvesting_time_month", data:"Flower_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"flowerharvestingtimemonth" },
  { key:'fruit_harvesting_time_month', symbol:"#fruit_harvesting_time_month", data:"Fruit_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"fruitharvestingtimemonth" },
  { key:'seed_harvesting_time_month', symbol:"#seed_harvesting_time_month", data:"Seed_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"seedharvestingtimemonth" },
  { key:'bark_harvesting_time_month', symbol:"#bark_harvesting_time_month", data:"Bark_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"barkharvestingtimemonth" },
  { key:'pollen_harvesting_time_month', symbol:"#pollen_harvesting_time_month", data:"Pollen_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"pollenharvestingtimemonth" },
  { key:'wood_harvesting_time_month', symbol:"#wood_harvesting_time_month", data:"Wood_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"woodharvestingtimemonth" },
  { key:'apical_bud_harvesting_time_month', symbol:"#apical_bud_harvesting_time_month", data:"Apical_bud_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"apicalbudharvestingtimemonth" },
  { key:'seedpod_harvesting_time_month', symbol:"#seedpod_harvesting_time_month", data:"Seedpod_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"seedpodharvestingtimemonth" },
  { key:'manna_harvesting_time_month', symbol:"#manna_harvesting_time_month", data:"Manna_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"mannaharvestingtimemonth" },
  { key:'shoot_harvesting_time_month', symbol:"#shoot_harvesting_time_month", data:"Shoot_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"shootharvestingtimemonth" },
  { key:'nectar_harvesting_time_month', symbol:"#nectar_harvesting_time_month", data:"Nectar_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"nectarharvestingtimemonth" },
  { key:'sap_harvesting_time_month', symbol:"#sap_harvesting_time_month", data:"Sap_Harvesting_time_month", icon:"", typ:'normal', use:"cal", i18n:"sapharvestingtimemonth" },

  { key:'harvesting_time_under_glass_month', symbol:"#harvesting_time_under_glass_month", data:"Harvesting_time_under_glass_month", icon:"", typ:'normal', use:"cal2", i18n:"harvestingtimeunderglassmonth" },
  { key:'harvesting_time_in_ground_month', symbol:"#harvesting_time_in_ground_month", data:"Harvesting_time_in_ground_month", icon:"", typ:'normal', use:"cal2", i18n:"harvestingtimeingroundmonth" },
  { key:'eating_maturity_time_in_month', symbol:"#eating_maturity_time_in_month", data:"Eating_Maturity_time_in_month", icon:"", typ:'normal', use:"cal2", i18n:"eatingmaturitytimeinmonth" },
  { key:'harvest_storing_month', symbol:"#harvest_storing_month", data:"Harvest_storing_month", icon:"", typ:'normal', use:"cal2", i18n:"harveststoringmonth" },

  { key:'plant_height_max_mm', symbol:"#plant_height_max_mm", data:"Plant_height_max_mm", icon:"", typ:'normal', use:"fill", i18n:"plantheightmax" },
  { key:'plant_height_average_mm', symbol:"#plant_height_average_mm", data:"Plant_height_average_mm", icon:"", typ:'normal', use:"fill", i18n:"plantheightavg" },
  { key:'plant_width_max_mm', symbol:"#plant_width_max_mm", data:"Plant_width_max_mm", icon:"", typ:'normal', use:"fill", i18n:"plantwidthmax" },
  { key:'plant_width_average_mm', symbol:"#plant_width_average_mm", data:"Plant_width_average_mm", icon:"", typ:'normal', use:"fill", i18n:"plantwidthavg" },
  { key:'plant_root_depth_average_mm', symbol:"#plant_root_depth_average_mm", data:"Plant_root_depth_average_mm", icon:"", typ:'normal', use:"fill", i18n:"rootdepthavg" },
  { key:'plant_root_width_average_mm', symbol:"#plant_root_width_average_mm", data:"Plant_root_width_average_mm", icon:"", typ:'normal', use:"fill", i18n:"rootwidthavg" },
  { key:'plant_space_filling_mm', symbol:"#plant_space_filling_mm", data:"Plant_space_filling_mm", icon:"", typ:'normal', use:"create", i18n:"plantspacefilling" },

  { key:'plant_planting_seed_dept_mm', symbol:"#plant_planting_seed_dept_mm", data:"Plant_planting_seed_dept_mm", icon:"", typ:'splitminus', use:"create", i18n:"plantplantingseeddeptmm" },
  { key:'plant_planting_seed_soil_temperature_celsius', symbol:"#plant_planting_seed_soil_temperature_celsius", data:"Plant_planting_seed_soil_temperature_celsius", icon:"create", typ:'splitminus', use:"", i18n:"seedsoiltemperature" },
  { key:'plant_planting_plant_distance_mm', symbol:"#plant_planting_plant_distance_mm", data:"Plant_planting_plant_distance_mm", icon:"", typ:'splitminus', use:"create", i18n:"plantdistance" },
  { key:'days_to_germination', symbol:"#days_to_germination", data:"Days_to_Germination", icon:"", typ:'splitminus', use:"create", i18n:"daystogermination" },
  { key:'days_to_maturity', symbol:"#days_to_maturity", data:"Days_to_Maturity", icon:"", typ:'splitminus', use:"create", i18n:"daystomaturity" },
  { key:'days_to_harvest', symbol:"#days_to_harvest", data:"Days_to_Harvest", icon:"", typ:'splitminus', use:"create", i18n:"daystoharvest" },
  { key:'plants_per_square_meter', symbol:"#plants_per_square_meter", data:"Plants_per_square_meter", icon:"", typ:'splitminus', use:"create", i18n:"plantsperm2" },
  
  { key:'planting_style', symbol:"#planting_style", data:"Planting_style", icon:"", typ:'normal', use:"create", i18n:"plantingstyle" },
  { key:'cultivation_type', symbol:"#cultivation_type", data:"Cultivation_type", icon:"", typ:'normal', use:"create", i18n:"cultivationtype" },
  { key:'plant_growing_lifecycle', symbol:"#plant_growing_lifecycle", data:"Plant_growing_lifecycle", icon:"", typ:'split', use:"create", i18n:"lifecycle" },
  { key:'plant_growing_habit', symbol:"#plant_growing_habit", data:"Plant_growing_habit", icon:"", typ:'split', use:"create", i18n:"growthhabit" },
  { key:'planting_location', symbol:"#planting_location", data:"Planting_location", icon:"", typ:'normal', use:"create", i18n:"plantinglocation" },
  
  { key:'plant_flower_color', symbol:"#plant_flower_color", data:"Plant_flower_color", icon:"", typ:'normal', use:"create", i18n:"plantflowercolor" },
  { key:'leaf_color', symbol:"#leaf_color", data:"Leaf_color", icon:"", typ:'split', use:"create", i18n:"leafcolor" },
  
  { key:'hardiness_zone_usda', symbol:"#hardiness_zone_usda", data:"Hardiness_Zone_USDA", icon:"", typ:'split', use:"create", i18n:"hardinesszoneusda" },
  { key:'minimum_temperature', symbol:"#minimum_temperature", data:"Minimum_temperature", icon:"", typ:'split', use:"create", i18n:"minimumtemperature" },

  { key:'plant_description', symbol:"#plant_description", data:"Plant_description", icon:"", typ:'split', use:"create", i18n:"plantdescription" },
  { key:'edible_parts_description', symbol:"#edible_parts_description", data:"Edible_parts_description", icon:"create", typ:'split', use:"", i18n:"ediblepartsdescription" },
  { key:'benefits', symbol:"#benefits", data:"Benefits", icon:"", typ:'split', use:"create", i18n:"benefits" },
  { key:'needed_polinators', symbol:"#needed_polinators", data:"Needed_polinators", icon:"", typ:'split', use:"create", i18n:"neededpolinators" },
  { key:'native_range', symbol:"#native_range", data:"Native_range", icon:"", typ:'split', use:"create", i18n:"nativerange" },

  { key:'propagation', symbol:"#propagation", data:"Propagation", icon:"", typ:'normal', use:"create", i18n:"propagation" },
  { key:'plant_seed_survival_time_month', symbol:"#plant_seed_survival_time_month", data:"Plant_seed_survival_time_month", icon:"", typ:'splitminus', use:"create", i18n:"seedsurvivaltime" },

  { key:'fruit_length_mm', symbol:"#fruit_length_mm", data:"Fruit_length_mm", icon:"", typ:'splitminus', use:"create", i18n:"fruitlength" },
  { key:'fruit_width_mm', symbol:"#fruit_width_mm", data:"Fruit_width_mm", icon:"", typ:'splitminus', use:"create", i18n:"fruitwidth" },
  { key:'fruit_weight_mm', symbol:"#fruit_weight_mm", data:"Fruit_weight_mm", icon:"", typ:'splitminus', use:"create", i18n:"fruitweight" },

  { key:'shade_tolerance', symbol:"#shade_tolerance", data:"Shade_tolerance", icon:"", typ:'coded', use:"create", i18n:"shadetolerance" },
  { key:'moisture_need', symbol:"#moisture_need", data:"Moisture_need", icon:"", typ:'coded', use:"create", i18n:"moistureneed" },
  { key:'soil_need', symbol:"#soil_need", data:"Soil_need", icon:"", typ:'coded', use:"create", i18n:"soilneed" },
  { key:'ph_need', symbol:"#ph_need", data:"PH_need", icon:"", typ:'coded', use:"create", i18n:"phneed" },
  { key:'growth_rate', symbol:"#growth_rate", data:"Growth_rate", icon:"u_growing_speed.svg", typ:'coded', use:"create", i18n:"growthrate" },
  { key:'wind_tolerance', symbol:"#wind_tolerance", data:"Wind_tolerance", icon:"", typ:'coded', use:"create", i18n:"windtolerance" },
  { key:'watering_regime', symbol:"#watering_regime", data:"Watering_regime", icon:"", typ:'split', use:"create", i18n:"wateringregime" },
  { key:'pest_resistance', symbol:"#pest_resistance", data:"Pest_resistance", icon:"", typ:'split', use:"create", i18n:"pestresistance" },
  { key:'nitrogen_fixer', symbol:"#nitrogen_fixer", data:"Nitrogen_fixer", icon:"", typ:'split', use:"create", i18n:"nitrogenfixer" },
  
  { key:'plant_root_type', symbol:"#plant_root_type", data:"Plant_root_type", typ:'split', icon:"", use:"create", i18n:"roottype" },
  { key:'foliage_type', symbol:"#foliage_type", data:"Foliage_type", icon:"", typ:'split', use:"create", i18n:"foliagetype" },
  { key:'flower_type', symbol:"#flower_type", data:"Flower_type", icon:"", typ:'split', use:"create", i18n:"flowertype" },

  { key:'storage_duration_month', symbol:"#storage_duration_month", data:"Storage_duration_month", icon:"", typ:'splitminus', use:"create", i18n:"storageduration" },
  { key:'yield_per_plant', symbol:"#yield_per_plant", data:"Yield_per_plant", icon:"", typ:'splitminus', use:"create", i18n:"yieldperplant" },
  
  { key:'companion_plants', symbol:"#companion_plants", data:"Companion_plants", icon:"", typ:'split', use:"create", i18n:"companionplants" },
  { key:'allopatic_effect', symbol:"#allopatic_effect", data:"Allopatic_effect", icon:"", typ:'split', use:"create", i18n:"allopaticeffect" },
  { key:'allopatic_sensitivity', symbol:"#allopatic_sensitivity", data:"Allopatic_sensitivity", icon:"", typ:'split', use:"create", i18n:"allopaticsensitivity" },
  { key:'allopatic_tolerance', symbol:"#allopatic_tolerance", data:"Allopatic_tolerance", icon:"", typ:'split', use:"create", i18n:"allopatictolerance" },
  { key:'soil_microbiology', symbol:"#soil_microbiology", data:"Soil_microbiology", icon:"", typ:'split', use:"create", i18n:"soilmicrobiology" },

  { key:'active_in_page', symbol:"#active_in_page", data:"Active_in_page", icon:"", typ:'normal', use:"calc", i18n:"activeinpage" },
  { key:'active_in_nfc', symbol:"#active_in_nfc", data:"Active_in_NFC", icon:"", typ:'normal', use:"calc", i18n:"activeinnfc" },
  { key:'data_status', symbol:"#data_status", data:"Data_status", icon:"", typ:'normal', use:"calc", i18n:"datastatus" },
  
  { key:'source_of_plant', symbol:"#source_of_plant", data:"Source_of_plant", icon:"", typ:'normal', use:"not", i18n:"sourceofplant" },
  { key:'status_datasource', symbol:"#status_datasource", data:"Status/datasource", icon:"", typ:'normal', use:"not", i18n:"statusdatasource" },
  { key:'list_of_varieties', symbol:"#list_of_varieties", data:"List_of_varieties", icon:"", typ:'split', use:"not", i18n:"listofvarieties" },
  { key:'egyeb', symbol:"#egyeb", data:"Egyéb", icon:"", typ:'normal', use:"not", i18n:"egyeb" }
];
// Category CSV columns to render icons for
const CATEGORY_PART_COLUMNS = [
  'Raw_edible_parts_all',
  'Prepared_edible_parts_all',
  'Toxic_parts_all',
  'Medicinal_parts_all',
];

// ── Fieled dependent utilities ───────────────────────────────────────────────────────────

function getMonthColumns() {
  return [
    { field: "Planting_time_under_glass_months", label: t('planning.plantingCover'),   id: "planting-cover"   },
    { field: "Planting_time_in_ground_month", label: t('planning.plantingGround'),  id: "planting-ground"  },
    { field: "Harvesting_time_under_glass_months",label: t('planning.harvestingCover'), id: "harvesting-cover" },
    { field: "Harvesting_time_in_ground_month",label: t('planning.harvestingGround'),id: "harvesting-ground"},
  ];
}

function getCalender1Tracks() {
  return [
    { id: "planting",       label: t('cal.tracks.planting'),       color: "#3f3f3f"   },
    { id: "flowering",      label: t('cal.tracks.flowering'),      color: "#b6b62d"   },
    { id: "occupyingSpace", label: t('cal.tracks.occupyingSpace'), color: "#88b62d"   },
    { id: "harvestMaturity",label: t('cal.tracks.harvestMaturity'),color: "#ff7d00"   },
    { id: "harvesting",     label: t('cal.tracks.harvesting'),     color: "#00ccbb"   },
    { id: "eatingMaturity", label: t('cal.tracks.eatingMaturity'), color: "#c40000"   },
    { id: "harvestStoring", label: t('cal.tracks.harvestStoring'), color: "#cc8f0090" },
    { id: "seedSaving",     label: t('cal.tracks.seedSaving'),     color: "#0018cc"   },
  ];
}

// ── Pure utilities ───────────────────────────────────────────────────────────

function normalizeName(name) {
  return name.toLowerCase().replaceAll(" ", "_");
}

function buildSearchText(value, useSplit = false) {
  const raw = value ?? "";
  if (useSplit && typeof raw === "string") {
    return splitPipe(raw).filter(Boolean).map(v => String(v).trim()).join(", ").toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

function getCalender1MonthLabels() {
  return t('cal.months');
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

function readSvgPixelSize(svgElement) {
  const widthAttr  = Number.parseFloat(svgElement.getAttribute("width"));
  const heightAttr = Number.parseFloat(svgElement.getAttribute("height"));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr)) {
    return { width: widthAttr, height: heightAttr };
  }
  const viewBox = svgElement.viewBox?.baseVal;
  if (viewBox?.width > 0 && viewBox?.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const computed = window.getComputedStyle(svgElement);
  const widthCss  = Number.parseFloat(computed.width);
  const heightCss = Number.parseFloat(computed.height);
  if (Number.isFinite(widthCss) && Number.isFinite(heightCss)) {
    return { width: widthCss, height: heightCss };
  }
  throw new Error("Unable to detect SVG dimensions.");
}

function resizeSvgByReference({ baseSvg, targetSvg, baseRealSize, targetRealSize, keepAspectRatio = false }) {
  const basePixels = readSvgPixelSize(baseSvg);
  const scaleX = targetRealSize.width  / baseRealSize.width;
  const scaleY = targetRealSize.height / baseRealSize.height;
  let tw = basePixels.width  * scaleX;
  let th = basePixels.height * scaleY;
  if (keepAspectRatio) {
    const s = Math.min(scaleX, scaleY);
    tw = basePixels.width * s;
    th = basePixels.height * s;
  }
  baseSvg.style.width    = `${basePixels.width}px`;
  baseSvg.style.height   = `${basePixels.height}px`;
  targetSvg.style.width  = `${tw}px`;
  targetSvg.style.height = `${th}px`;
}

function makePartSvgIcon(term, id = null, type = 'display:inline-block') {
  const def = PART_ICON_MAP[term];
  if (!def) return null;
  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  console.log("make svg from: "+def.symbolid);

      // 4. DYNAMICALLY take parameters from the file
      const sourceSvg1 = document.getElementById(def.symbolid);;
     if (!sourceSvg1) { console.log("not found: "+def.symbolid);return;}
    // This ensures the icon always fits perfectly
    const originalViewBox = sourceSvg1.getAttribute('viewBox');
    const originalWidth = sourceSvg1.getAttribute('width');
    const originalHeight = sourceSvg1.getAttribute('height');
    if (originalViewBox) {
      svg.setAttribute('viewBox', originalViewBox);
    } else if (originalWidth && originalHeight) {
      // Fallback if viewBox is missing but dimensions exist
      svg.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);
    } else {
      // Default fallback
      svg.setAttribute('viewBox', '0 0 512 512');
    }
   //setting
  svg.setAttribute('class', def.class);
  //svg.setAttribute('viewBox', '0 0 512 512');
  //svg.setAttribute('aria-hidden', 'true');
  //svg.style.cssText = 'width:20px;height:20px;display:inline-block;margin-right:6px';
  svg.style.cssText = type; //'display:inline-block'
  if (id) {
    const makeID = `${term}-${id}`;
    svg.setAttribute('id', makeID);
  }
  const use = document.createElementNS(svgns, 'use');
  use.setAttribute('href', def.symbol);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', def.symbol);
  svg.appendChild(use);
  return svg;
}

// ── Identity filter links ────────────────────────────────────────────────────

function setIdentityFilterLink(element, filterType, value) {
  if (!element) return;
  element.textContent = " / ";
  const cleanedValue = String(value || "").trim();
  if (!cleanedValue) return;
  const link = document.createElement("a");
  link.href = `pages/PlantListPage.html?filterType=${encodeURIComponent(filterType)}&filterValue=${encodeURIComponent(cleanedValue)}`;
  link.textContent = cleanedValue;
  element.appendChild(link);
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

function uniqueCALENDER1Slots(...values) {
  const slots = new Set();
  splitPipe(values.join("|")).forEach((token) => {
    const match = token.match(/^(\d{1,2})(?:\.(\d))?$/);
    if (!match) return;
    const month = Number.parseInt(match[1], 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) return;
    if (match[2] === undefined) {
      for (let week = 1; week <= 4; week++) slots.add(`${month}-${week}`);
    } else {
      const week = Number.parseInt(match[2], 10);
      if (Number.isInteger(week) && week >= 1 && week <= 4) slots.add(`${month}-${week}`);
    }
  });
  return slots;
}

function renderCALENDER1(plant,FM) {
  const root = document.querySelector("#CALENDER1");
  if (!root) return;

  const data = {
  planting: uniqueCALENDER1Slots(
    plant[FM.planting_time_under_glass_months],
    plant[FM.planting_time_in_ground_month]
  ),

  occupyingSpace: uniqueCALENDER1Slots(
    plant[FM.occupying_space_month]
  ),

  flowering: uniqueCALENDER1Slots(
    plant[FM.flowering_time_month]
  ),

  harvestMaturity: uniqueCALENDER1Slots(
    plant[FM.fruit_harvesting_time_month]
  ),

  eatingMaturity: uniqueCALENDER1Slots(
    plant[FM.eating_maturity_time_in_month]
  ),

  harvesting: uniqueCALENDER1Slots(
    plant[FM.sap_harvesting_time_month],
    plant[FM.nectar_harvesting_time_month],
    plant[FM.shoot_harvesting_time_month],
    plant[FM.seedpod_harvesting_time_month],
    plant[FM.apical_bud_harvesting_time_month],
    plant[FM.wood_harvesting_time_month],
    plant[FM.pollen_harvesting_time_month],
    plant[FM.bark_harvesting_time_month],
    plant[FM.leaf_harvesting_time_month],
    plant[FM.stem_harvesting_time_month],
    plant[FM.flower_harvesting_time_month],
    plant[FM.fruit_harvesting_time_month],
    plant[FM.seed_harvesting_time_month],
    plant[FM.root_harvesting_time_month]
  ),

  harvestStoring: uniqueCALENDER1Slots(
    plant[FM.harvest_storing_month]
  ),

  seedSaving: uniqueCALENDER1Slots(
    plant[FM.seed_harvesting_time_month]
  ),
};

  const tracks  = getCalender1Tracks();
  const months  = getCalender1MonthLabels();
  const frag    = document.createDocumentFragment();

  // Month header
  const monthHeader = document.createElement("div");
  monthHeader.className = "CALENDER1-months";
  months.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "CALENDER1-month";
    cell.textContent = label;
    monthHeader.appendChild(cell);
  });
  frag.appendChild(monthHeader);

  // Track rows
  tracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "CALENDER1-row";
    const activeSlots = data[track.id];
    for (let month = 1; month <= 12; month++) {
      for (let sub = 1; sub <= 4; sub++) {
        const cell = document.createElement("div");
        cell.className = sub === 4 ? "CALENDER1-cell month-end" : "CALENDER1-cell";
        if (activeSlots.has(`${month}-${sub}`)) {
          cell.classList.add("active");
          cell.style.setProperty("--CALENDER1-color", track.color);
        }
        row.appendChild(cell);
      }
    }
    frag.appendChild(row);
  });

  // Legend
  const legend = document.createElement("div");
  legend.className = "CALENDER1-legend";
  tracks.forEach((track) => {
    const item = document.createElement("div");
    item.className = "CALENDER1-legend-item";
    item.innerHTML = `<span class="swatch" style="background:${track.color}"></span>${track.label}`;
    legend.appendChild(item);
  });
  frag.appendChild(legend);

  root.innerHTML = "";
  root.appendChild(frag);
}

// ── Planning table ───────────────────────────────────────────────────────────

function populatePlanningTable(plant) {
  const tbody = document.querySelector("#planning-table-body");
  const frag  = document.createDocumentFragment();

  getMonthColumns().forEach(({ field, label, id }, rowIndex) => {
    const months = new Set(monthsFromValue(plant[field] || ""));
    const row    = document.createElement("tr");
    if (id) row.setAttribute('data-row-id', id);
    const th = document.createElement("td");
    th.textContent = label;
    row.appendChild(th);
    for (let month = 1; month <= 12; month++) {
      const cell = document.createElement("td");
      if (months.has(month)) {
        cell.style.backgroundColor = ROW_COLORS[rowIndex % ROW_COLORS.length];
        cell.textContent = "●";
      }
      row.appendChild(cell);
    }
    frag.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(frag);
}

// ── Icon colouring ───────────────────────────────────────────────────────────
let edibleText = "";
let ediblePreparedText = "";
let toxicText = "";
let medicinalText = "";

function edibilityClass(term) {
    const t = term.toLowerCase();
    if (toxicText.includes(t))           return "red";
    if (ediblePreparedText.includes(t))  return "yellow";
    if (edibleText.includes(t))          return "green";
    return "black";
  }

function applyIconColours() {
  // Colour all harvest icons
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    const filter = `.${part}-harvest-icon`;
    const icons = document.querySelectorAll(`.${part}-harvest-icon`);
    console.log("part: "+icons+" filter: "+filter+" color: "+cls);
    icons.forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });

  return edibilityClass; // expose for callers that need it
}

// ── Harvest part icons in planning table row ─────────────────────────────────

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
      const makeID = `harv-icon-${month}`;
      const svg = makePartSvgIcon(term,makeID,'display:inline-block'); //
      // Example: Adding the "bark1" icon to a div
      /*
       const container = document.getElementById('icon-container');
    
         makePartSvgIcon('bark1', './icons/').then(svgElement => {
             if (svgElement) {
                container.appendChild(svgElement);
                  }
                });
      */
      if (svg) cell.appendChild(svg);
    });
  });

  // Colour icons after all are inserted (single pass)
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });
}
// ── Category icons row ───────────────────────────────────────────────────────

function insertCategoryIconsRow(plant, mode, vers) {
  // mode = 'per-category' : one icon per part per category column (original behaviour)
  // mode = 'unique'       : one icon per part, regardless of how many columns contain it
  // vers = 'harv' / 'med'                 : Which version is it harv - all part, med - medicinal part
  const containerName = `#part-icons-row-${vers}`;
  const container = document.querySelector(containerName);
  let iconsmade = 0;
  if (!container) { console.warn('Missing #part-icons-row container'); return; }
  const frag = document.createDocumentFragment();
   
  if (mode === 'unique') {
    // Collect all parts that appear in ANY category column, deduplicated
    const seenParts = new Set();

    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;

      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => seenParts.add(part));
    });

    seenParts.forEach(part => {
      const id  = `${vers}-icon`;
      const svg = makePartSvgIcon(part, id,'display:inline-block');
      if (svg) frag.appendChild(svg);
      iconsmade = iconsmade+1;
    });

  } else {
    // 'per-category': one icon per part per column
    CATEGORY_PART_COLUMNS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(plant, key)) return;
      const value = plant[key];
      if (!value || value === '0') return;

      String(value).toLowerCase().split('|').map(v => v.trim()).filter(Boolean)
        .forEach(part => {
          const id  = `${vers}-icon-${key}`;
          const svg = makePartSvgIcon(part, id,'display:inline-block');
          if (svg) frag.appendChild(svg);
          iconsmade++;
        });
    });
  }
  // none icon
  if (iconsmade == 0) {
    const id  = `none-${vers}-icon`;
    const svg = makePartSvgIcon('none', id,'display:inline-block');
    if (svg) frag.appendChild(svg);
  }
  
  // Colour icons after all are inserted (single pass)
  PARTS.forEach(part => {
    const cls   = edibilityClass(part);
    document.querySelectorAll(`.${part}-harvest-icon`).forEach(svg => {
      svg.classList.remove("green", "red", "black", "yellow");
      svg.classList.add(cls);
    });
  });
  
  container.innerHTML = '';
  container.appendChild(frag);
}

// ── Size icons ───────────────────────────────────────────────────────────────
/*
function applySizeIcons_old(plant,FM) {
  const type = splitPipe(plant[FM.plant_type]).join(", ");
  console.log("típus: " +type);
  const humanSvg = document.getElementById("size-human-icon-1");
  if (!humanSvg) return;
  const treeSvg  = document.getElementById("size-tree-icon-2");
  if (!treeSvg) return;
  const bushSvg  = document.getElementById("size-bush-icon-1");
  if (!bushSvg) return;
  const plantSvg = document.getElementById("size-plant-icon-1");
  if (!plantSvg) return;
  
  const wAvg = plant[FM.plant_width_average_mm];
  const hAvg = plant[FM.plant_height_average_mm];
  const rootW = plant[FM.plant_root_width_average_mm];
  const rootH = plant[FM.plant_root_depth_average_mm];
  
console.log("test in sie fc FM p widht: "+wAvg);

 const iconSizeTargets = [
  { id: "size-tree-icon-2",  w: wAvg,  h: hAvg },
  { id: "size-house-icon-1", w: 6000,  h: 4000 },
  { id: "size-root-icon-1",  w: rootW, h: rootH },
  { id: "size-plant-icon-1", w: wAvg,  h: hAvg },
  { id: "size-bush-icon-1",  w: wAvg,  h: hAvg }
  ];

  iconSizeTargets.forEach(({ id, w, h }) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      resizeSvgByReference({
        baseSvg: humanSvg, targetSvg: el,
        baseRealSize: DEFAULT_BASE_REAL_SIZE_MM,
        targetRealSize: { width: Number(w), height: Number(h) },
      });
    } catch (err) {
      console.warn(`Unable to resize ${id}:`, err);
    }
  });

  // Show only the correct plant type icon
  [treeSvg, bushSvg, plantSvg].forEach(s => { if (s) s.style.display = "none"; });  

  if      (type === "Tree")  { if (treeSvg)  treeSvg.style.display  = ""; }
  else if (type === "Bush")  { if (bushSvg)  bushSvg.style.display  = ""; }
  else                       { if (plantSvg) plantSvg.style.display = ""; }
}


//- cl -- new size icons
function applySizeIcons(plant, FM) {
  const type = splitPipe(plant[FM.plant_type]).join(", ");

  const humanSvg  = document.getElementById("size-human-icon-1");
  const treeSvg   = document.getElementById("size-tree-icon-2");
  const bushSvg   = document.getElementById("size-bush-icon-1");
  const plantSvg  = document.getElementById("size-plant-icon-1");
  const houseSvg  = document.getElementById("size-house-icon-1");
  const rootSvg   = document.getElementById("size-root-icon-1");

  if (!humanSvg) { console.warn("Human icon missing"); return; }

  // --- Step 1: Establish px/mm scale from the human icon ---
  // Human icon pixel dimensions (from the HTML attributes)
  const HUMAN_PX_H  = 66;   // px height of human SVG element
  const HUMAN_MM_H  = 1800; // real-world height in mm

  const pxPerMm = HUMAN_PX_H / HUMAN_MM_H;
  console.log(`Scale: ${pxPerMm.toFixed(4)} px/mm`);

  // --- Step 2: Read plant data ---
  const plantWmm  = Number(plant[FM.plant_width_max_mm])          || 1000;
  const plantHmm  = Number(plant[FM.plant_height_max_mm])         || 1000;
  const rootWmm   = Number(plant[FM.plant_root_width_average_mm]) || 500;
  const rootHmm   = Number(plant[FM.plant_root_depth_average_mm]) || 500;

  // House is fixed real-world reference: ~6000mm wide, ~4000mm tall
  const HOUSE_W_MM = 6000;
  const HOUSE_H_MM = 4000;

  // --- Step 3: Helper to resize an SVG to match real-world mm at our scale ---
  function scaleIcon(svgEl, realWmm, realHmm) {
    if (!svgEl) return;
    const targetPxW = realWmm * pxPerMm;
    const targetPxH = realHmm * pxPerMm;

    // Get the icon's natural aspect ratio from its viewBox
    const vb = svgEl.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      // Fit within target box while preserving aspect ratio
      const iconAspect   = vb.width / vb.height;
      const targetAspect = targetPxW / targetPxH;
      let finalW, finalH;
      if (iconAspect > targetAspect) {
        finalW = targetPxW;
        finalH = targetPxW / iconAspect;
      } else {
        finalH = targetPxH;
        finalW = targetPxH * iconAspect;
      }
      svgEl.style.width  = `${finalW}px`;
      svgEl.style.height = `${finalH}px`;
    } else {
      // Fallback: just set directly
      svgEl.style.width  = `${targetPxW}px`;
      svgEl.style.height = `${targetPxH}px`;
    }
    console.log(`${svgEl.id}: ${svgEl.style.width} x ${svgEl.style.height} (real: ${realWmm}x${realHmm}mm)`);
  }

  // --- Step 4: Apply scale to each icon ---
  scaleIcon(houseSvg,  HOUSE_W_MM, HOUSE_H_MM);
  scaleIcon(treeSvg,   plantWmm,   plantHmm);
  scaleIcon(bushSvg,   plantWmm,   plantHmm);
  scaleIcon(plantSvg,  plantWmm,   plantHmm);
  scaleIcon(rootSvg,   rootWmm,    rootHmm);

  // Human icon stays at fixed pixel size (it defines the scale)
  humanSvg.style.width  = `${HUMAN_PX_H * (31/66)}px`; // maintain its aspect
  humanSvg.style.height = `${HUMAN_PX_H}px`;

  // --- Step 5: Show only the right plant type icon ---
  [treeSvg, bushSvg, plantSvg].forEach(s => { if (s) s.style.display = "none"; });

  if      (type.includes("Tree")) { if (treeSvg)  treeSvg.style.display  = "block"; }
  else if (type.includes("Bush")) { if (bushSvg)  bushSvg.style.display  = "block"; }
  else                            { if (plantSvg) plantSvg.style.display = "block"; }
}*/

async function applySizeIcons(plant, FM) {
  const type = splitPipe(plant[FM.plant_type]).join(", ");

  const humanSvg  = document.getElementById("size-human-icon-1");
  const treeSvg   = document.getElementById("size-tree-icon-2");
  const bushSvg   = document.getElementById("size-bush-icon-1");
  const plantSvg  = document.getElementById("size-plant-icon-1");
  const houseSvg  = document.getElementById("size-house-icon-1");
  const rootSvg   = document.getElementById("size-root-icon-1");

  if (!humanSvg) { console.warn("Human icon missing"); return; }

  const HUMAN_PX_H = 66;
  const HUMAN_MM_H = 1800;
  const pxPerMm    = HUMAN_PX_H / HUMAN_MM_H;

  const plantWmm = Number(plant[FM.plant_width_max_mm])          || 1000;
  const plantHmm = Number(plant[FM.plant_height_max_mm])         || 1000;
  const rootWmm  = Number(plant[FM.plant_root_width_average_mm]) || 500;
  const rootHmm  = Number(plant[FM.plant_root_depth_average_mm]) || 500;
  const HOUSE_W_MM = 6000;
  const HOUSE_H_MM = 4000;

  // ── Step 1: fix viewBox BEFORE sizing ──────────────────────────────────
  // For each SVG that uses a <use>, measure the real content bbox
  // and override the viewBox so no empty space is included
  function fixViewBox(svgEl) {
    if (!svgEl) return;

    // Temporarily make visible so getBBox works
    const prevDisplay    = svgEl.style.display;
    const prevVisibility = svgEl.style.visibility;
    svgEl.style.display    = 'block';
    svgEl.style.visibility = 'hidden'; // visible to browser but not to user

    try {
      const useEl = svgEl.querySelector('use');
      if (!useEl) return;

      const bbox = useEl.getBBox();
      console.log(`${svgEl.id} getBBox:`, bbox);

      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 2;
        svgEl.setAttribute('viewBox',
          `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
        );
        console.log(`${svgEl.id} viewBox fixed to content bounds`);
      }
    } catch (e) {
      console.warn(`fixViewBox failed for ${svgEl.id}:`, e);
    }

    svgEl.style.display    = prevDisplay;
    svgEl.style.visibility = prevVisibility;
  }

  // Fix viewBox for all plant type icons
  // (house and root already work, but doesn't hurt to fix them too)
  [treeSvg, bushSvg, plantSvg, rootSvg, houseSvg].forEach(fixViewBox);

  // ── Step 2: now scale based on corrected viewBox ────────────────────────
  function scaleIcon(svgEl, realWmm, realHmm) {
    if (!svgEl) return;

    const targetPxW = realWmm * pxPerMm;
    const targetPxH = realHmm * pxPerMm;

    const vb = svgEl.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      const iconAspect   = vb.width / vb.height;
      const targetAspect = targetPxW / targetPxH;
      let finalW, finalH;
      if (iconAspect > targetAspect) {
        finalW = targetPxW;
        finalH = targetPxW / iconAspect;
      } else {
        finalH = targetPxH;
        finalW = targetPxH * iconAspect;
      }
      svgEl.style.width  = `${finalW}px`;
      svgEl.style.height = `${finalH}px`;
    } else {
      svgEl.style.width  = `${targetPxW}px`;
      svgEl.style.height = `${targetPxH}px`;
    }
    console.log(`${svgEl.id}: ${svgEl.style.width} x ${svgEl.style.height} (real: ${realWmm}x${realHmm}mm)`);
  }

  scaleIcon(houseSvg,  HOUSE_W_MM, HOUSE_H_MM);
  scaleIcon(treeSvg,   plantWmm,   plantHmm);
  scaleIcon(bushSvg,   plantWmm,   plantHmm);
  scaleIcon(plantSvg,  plantWmm,   plantHmm);
  scaleIcon(rootSvg,   rootWmm,    rootHmm);

  humanSvg.style.width  = `${HUMAN_PX_H * (31/66)}px`;
  humanSvg.style.height = `${HUMAN_PX_H}px`;

  // ── Step 3: show correct plant type ────────────────────────────────────
  [treeSvg, bushSvg, plantSvg].forEach(s => { if (s) s.style.display = "none"; });
  if      (type.includes("Tree")) { if (treeSvg)  treeSvg.style.display  = "block"; }
  else if (type.includes("Bush")) { if (bushSvg)  bushSvg.style.display  = "block"; }
  else                            { if (plantSvg) plantSvg.style.display = "block"; }
}
// ── Image loader ─────────────────────────────────────────────────────────────
async function loadPlantImage(plant) {
  const imgEl = document.getElementById("plantImg");
  if (!imgEl) return;
  // Convert Latin name to Wikipedia format
  const searchLatin = plant.LatinName.trim().replace(/\s+/g, "_");
  const searchVariety = plant.Name_Variety.trim().replace(/\s+/g, "_");
  
  //Build your local search key
  const imgText  = `${plant.Plant_ID}_${searchLatin}_${searchVariety}`;
  console.log("seach image text: "+imgText);
  const searchId = normalizeName(imgText);
 console.log("seach image norm text: "+searchId);
  try {
    //Try local image first
    const response = await fetch("images/images.json");
    const data = await response.json();

    if (data[searchId] && data[searchId][0]) {
      imgEl.src = `images/${data[searchId][0]}`;
      console.log("find image: "+`images/${data[searchId][0]}`);
      return; // stop if found locally
    }
    
    //Fallback to Wikipedia API
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${searchLatin}`
    );

    if (!wikiResponse.ok) throw new Error("Wiki fetch failed");

    const wikiData = await wikiResponse.json();

    if (wikiData.thumbnail && wikiData.thumbnail.source) {
      imgEl.src = wikiData.thumbnail.source;
      return;
    }

    //If no thumbnail, try original image
    if (wikiData.originalimage && wikiData.originalimage.source) {
      imgEl.src = wikiData.originalimage.source;
      return;
    }

    //Final fallback
    imgEl.src = "images/default.jpg";

  } catch (err) {
    console.error("Image load error:", err);
    imgEl.src = "images/default.jpg";
  }
}

// 1. Run this once when your app loads to "fix" the hidden templates
async function syncViewBoxes() {
    const container = document.getElementById('icon-container');
    const svgs = container.querySelectorAll('svg');

    for (let svg of svgs) {
        const useTag = svg.querySelector('use');
        const fileUrl = useTag.getAttribute('href');

        try {
            const response = await fetch(fileUrl);
            const text = await response.text();

            // Use the file's explicit viewport dimensions (width/height) as the container
            // viewBox so the full content is visible. When width/height differ from the
            // internal viewBox (e.g. width="1080" viewBox="0 0 810 810"), using the
            // internal viewBox would clip ~25% of the rendered content.
            const w = text.match(/width=["']([^"']+)["']/);
            const h = text.match(/height=["']([^"']+)["']/);
            const wVal = w ? parseFloat(w[1]) : NaN;
            const hVal = h ? parseFloat(h[1]) : NaN;
            if (!isNaN(wVal) && wVal > 0 && !isNaN(hVal) && hVal > 0) {
                svg.setAttribute('viewBox', `0 0 ${wVal} ${hVal}`);
            } else {
                // Fallback: use the file's own viewBox
                const viewBoxMatch = text.match(/viewBox=["']([^"']+)["']/);
                if (viewBoxMatch) svg.setAttribute('viewBox', viewBoxMatch[1]);
            }
        } catch (err) {
            console.error(`Could not sync viewBox for ${fileUrl}:`, err);
        }
    }
}


// decodeValue 
   // shade_tolerance: { F: 'full shade', S: 'semi-shade', N: 'no shade' },
function getCodeValue(key, value) {
  if (!value || !T_CODE_MAP[key]) return value || "";

  // handle multiple values like "F|S"
  const values = value.split("|");

  return values
    .map(v => T_CODE_MAP[key][v] || v)
    .join(", ");
}
// ── Field ganerator  ─────────────────────────────────────────────────────────────────────
function renderFields(containerId, map, plant) {
  const container = document.getElementById(containerId);
  if (!container) return;
// renderFields("fields1", BASIC_FIED_MAP, plant)
  // Clear previous content
  container.innerHTML = "";
  // { key:'shade_tolerance', symbol:"#shade_tolerance", data:"Shade_tolerance", icon:"", typ:'coded', use:"create", i18n:"shadetolerance" },
   // shade_tolerance: { F: 'full shade', S: 'semi-shade', N: 'no shade' },
  // Helper formatter
  const formatValue = (value, type, key) => {
    if (!value) return "";

    switch (type) {
      case "coded":
         getCodeValue(key, value);
      case "split":
        return splitPipe(value).join(", ");
      case "splitminus":
        return splitPipe(value).join(" – ");
      case "normal":
      default:
        return value;
    }
  };

  const VISIBLE_TYPES = new Set(["show", "fill", "create"]);
  map
    .filter(item => VISIBLE_TYPES.has(item.use))
    .forEach(item => {

    if (item.use === "fill"){
            const rawValue1 = plant[item.data];
            const formattedValue1 = formatValue(rawValue1, item.typ, item.key);
            const input1 = document.querySelector(item.symbol);
            console.log("chosen item to fill: "+item.symbol);
            if (input1) input1.value = formattedValue1 || "";
    } else if (item.use === "create"){

      const rawValue = plant[item.data];
      const formattedValue = formatValue(rawValue, item.typ, item.key);

      // Create card element
      const card = document.createElement("div");
      card.className = "field-card";

      const label = document.createElement("span");
      label.className = "field-card__label";
      label.setAttribute("data-i18n", `detail.label.${item.i18n}`);
      label.textContent = t(`detail.label.${item.i18n}`);

      const value = document.createElement("span");
      value.className = "field-card__value" + (formattedValue ? "" : " field-card__value--empty");
      value.id = item.key;
      value.textContent = formattedValue || "–";
       
      card.appendChild(label);
      card.appendChild(value);
      container.appendChild(card);
      }
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────

const selectedNr  = localStorage.getItem("selectedPlantNr");
const urlParams   = new URLSearchParams(window.location.search);
const urlPlantId  = urlParams.get("id");

document.querySelector("#back-button").addEventListener("click", () => {
  window.location.href = "Homepage.html";
});

(async function init() {
  setupLanguageButtons();
  await syncViewBoxes();
  
  const title             = document.querySelector("#primary-title");
  const subtitle          = document.querySelector("#secondary-title");
  const identityfamily    = document.querySelector("#identity-family");
  const identitygenus     = document.querySelector("#identity-genus");
  const identitylatinName = document.querySelector("#identity-latinName");
  const identityvariety   = document.querySelector("#identity-variety");

  if (!selectedNr && !urlPlantId) {
    title.textContent    = t('detail.noPlantSelected');
    subtitle.textContent = t('detail.noPlantSelectedMsg');
    return;
  }
   
  try {
    // ── Single data load ──────────────────────────────────────────────────
    const lookupNr  = urlPlantId || selectedNr;
    const { plant, varieties }    = await loadPlantIdWithVarieties(lookupNr);

    if (!plant) {
      title.textContent    = t('detail.plantNotFound');
      subtitle.textContent = t('detail.plantNotFoundMsg');
      return;
    }
    
    // ── Cache data once ─────────────────────────────────────────── 
    const FM = Object.fromEntries(BASIC_FIED_MAP.map(f => [f.key, f.data]));
    console.log("cache ready");
    console.log("example data, plant width av: "+plant[FM.plant_width_average_mm]);
               
    // ── Title & identity ──────────────────────────────────────────────────
    const lang          = getCurrentLang();
    const primaryName   = lang === 'en' ? (plant.Name_EN || plant.Name_HU || "Unknown") : (plant.Name_HU || plant.Name_EN || "Unknown");
    const secondaryName = lang === 'en' ? (plant.Name_HU || "") : (plant.Name_EN || "");
    title.textContent   = secondaryName ? `${primaryName}   |   ${secondaryName}` : primaryName;
    subtitle.textContent = plant.Name_Variety || "Unknown";

    setIdentityFilterLink(identityfamily,    "family", plant.Family);
    setIdentityFilterLink(identitygenus,     "genus",  plant.Genus);
    setIdentityFilterLink(identitylatinName, "latin",  plant.LatinName);
    if (identityvariety) identityvariety.innerHTML = `<strong> / ${plant.Name_Variety || ""}</strong>`;
    
    // write it if data is not ready
    const message1=document.getElementById('data_status');
    if (plant.Data_status==="No") {  
      message1.textContent = "Database not yet filled!";
      message1.style.display = "inline-block";
      console.log("data not ready. plant.Data_status= "+plant.Data_status);
    } else {message1.style.display = "none"; console.log("data ready. plant.Data_status= "+plant.Data_status);}
       
    // ── Build search texts once ───────────────────────────────────────────
    edibleText         = buildSearchText(plant.Raw_edible_parts_all,      true);
    ediblePreparedText = buildSearchText(plant.Prepared_edible_parts_all, true);
    toxicText          = buildSearchText(plant.Toxic_parts_all,           true);
    medicinalText      = buildSearchText(plant.Medicinal_parts_all,       true);
    
    // ── Form fields ───────────────────────────────────────────────────────
    renderFields("fields1", BASIC_FIED_MAP, plant);
    // NFC link
    const nfcEl = document.querySelector("#nfc-link");
    if (nfcEl) nfcEl.textContent = `${plant.Plant_ID}  / ${primaryName} / ${plant.Name_Variety || ""} / ${plant.LatinName || ""} / ${window.location.href}`;
   
    // ── Planning table + calendar ─────────────────────────────────────────
    populatePlanningTable(plant);
    renderCALENDER1(plant,FM);

        // ── Varieties list ────────────────────────────────────────────────────
    const varietiesList = document.querySelector("#varieties-list");
     if (varietiesList) {
      varietiesList.innerHTML = varieties.length
       ? varieties.map(v => `<li><a href="P.html?id=${v.Plant_ID}">${v.Name_Variety}</a></li>`).join("")
       : `<li>${t('detail.noVarieties')}</li>`;
    }
    
        // ── Icon colouring (single pass) ──────────────────────────────────────
    const edibilityClassValue = applyIconColours();
    
    // ── Harvest icons in table + category icons row (one colourByTerm pass)
    insertPartIconsInTable(plant);
    insertCategoryIconsRow(plant,"unique","harv");
    insertCategoryIconsRow(plant,"unique","med");
    
    // ── Size icons ────────────────────────────────────────────────────────
    //insertSizeIconsRow();
    applySizeIcons(plant,FM);

    // ── Image (non-blocking) ──────────────────────────────────────────────
    loadPlantImage(plant); // intentionally not awaited — fires & forgets
    
    applyTranslations();
  } catch (error) {
    console.error("Error loading plant data:", error);
    document.querySelector("#primary-title").textContent = t('detail.error.loadPlant');
  }
})();
