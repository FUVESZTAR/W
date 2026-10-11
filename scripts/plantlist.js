import { loadActivePagePlants, loadAllPagePlants, splitPipe } from "./csv-utils.js";
import { t, getCurrentLang, setupLanguageButtons } from "./lang.js";
import { makeSelectSearchable } from "./searchable-select.js";

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "../Homepage.html";
});

function buildDropdown(selectEl, allValues, placeholder) {
  const current = selectEl.value;
  selectEl.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = placeholder;
  selectEl.appendChild(all);
  allValues.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  // Use case-insensitive match so URL params like "ribes" correctly select "Ribes"
  const match = current
    ? allValues.find(v => v.toLowerCase() === current.toLowerCase())
    : undefined;
  selectEl.value = match !== undefined ? match : "";
}

function renderRows(plants) {
  const tbody = document.getElementById("plant-list-body");
  if (!plants.length) {
    tbody.innerHTML = `<tr><td colspan="5">${t('list.empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  plants.forEach((plant) => {
    const tr = document.createElement("tr");
    const varieties = splitPipe(plant.Name_Variety);
    tr.innerHTML = `
      <td>${plant.Plant_ID || ""}</td>
      <td>${plant.LatinName || ""}</td>
      <td>${varieties.length ? varieties.join(", ") : ""}</td>
      <td>${plant.Name_EN || ""}</td>
      <td>${plant.Name_HU || ""}</td>
    `;
    tr.addEventListener("click", () => {
      localStorage.setItem("selectedPlantNr", plant.Plant_ID);
      window.location.href = `P.html?id=${encodeURIComponent(plant.Plant_ID)}`;
    });
    tbody.appendChild(tr);
  });
}

async function populate() {
  const filterSummary = document.getElementById("filter-summary");
  const errorMsg = document.getElementById("error-message");

  const params = new URLSearchParams(window.location.search);
  // When arriving from P.html via filterType/filterValue, load all plants so that
  // every member of the genus/family/latin name is shown regardless of Active_in_page.
  const hasFilterParam = params.has("filterType") || params.has("family") ||
                         params.has("genus") || params.has("latin");
  let plants = [];
  try {
    plants = hasFilterParam ? await loadAllPagePlants() : await loadActivePagePlants();
  } catch (err) {
    console.error(err);
    errorMsg.textContent = t('list.error.loadFailed');
    document.getElementById("plant-list-body").innerHTML =
      `<tr><td colspan="5">${t('list.error.loadData')}</td></tr>`;
    return;
  }

  plants.sort((a, b) => (a.LatinName || "").localeCompare(b.LatinName || ""));

  const lang = getCurrentLang();
  const nameField = lang === 'hu' ? 'Name_HU' : 'Name_EN';

  const ddFamily  = document.getElementById("dd-family");
  const ddGenus   = document.getElementById("dd-genus");
  const ddLatin   = document.getElementById("dd-latin");
  const ddNameHu  = document.getElementById("dd-nameHu");
  const ddNameEn  = document.getElementById("dd-nameEn");
  const ddVariety = document.getElementById("dd-variety");

  // Show only the name dropdown (and its search input wrapper) for the active language
  const ddNameHuCol = ddNameHu.closest('.filter-col') || ddNameHu;
  const ddNameEnCol = ddNameEn.closest('.filter-col') || ddNameEn;
  ddNameHuCol.style.display = lang === 'hu' ? '' : 'none';
  ddNameEnCol.style.display = lang === 'en' ? '' : 'none';
  const ddName = lang === 'hu' ? ddNameHu : ddNameEn;

  // Set up live-search on each filter dropdown
  const searchFamily  = makeSelectSearchable(ddFamily,  'dd-family-search');
  const searchGenus   = makeSelectSearchable(ddGenus,   'dd-genus-search');
  const searchLatin   = makeSelectSearchable(ddLatin,   'dd-latin-search');
  const searchNameHu  = makeSelectSearchable(ddNameHu,  'dd-nameHu-search');
  const searchNameEn  = makeSelectSearchable(ddNameEn,  'dd-nameEn-search');
  const searchVariety = makeSelectSearchable(ddVariety, 'dd-variety-search');
  const searchName    = lang === 'hu' ? searchNameHu : searchNameEn;

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  // Family dropdown always shows all families (top of hierarchy)
  buildDropdown(ddFamily, unique(plants.map(p => p.Family)), t('list.filter.allFamilies'));
  searchFamily.refresh();

  // Rebuild genus, latin, name and variety dropdowns so each level only
  // shows values that exist in the rows matching all higher-level filters.
  function rebuildDependentDropdowns() {
    const afterFamily = ddFamily.value
      ? plants.filter(p => p.Family === ddFamily.value)
      : plants;

    buildDropdown(ddGenus, unique(afterFamily.map(p => p.Genus)), t('list.filter.allGenera'));
    searchGenus.refresh();

    const afterGenus = ddGenus.value
      ? afterFamily.filter(p => p.Genus === ddGenus.value)
      : afterFamily;

    buildDropdown(ddLatin, unique(afterGenus.map(p => p.LatinName)), t('list.filter.allLatinNames'));
    searchLatin.refresh();

    const afterLatin = ddLatin.value
      ? afterGenus.filter(p => p.LatinName === ddLatin.value)
      : afterGenus;

    buildDropdown(ddName, unique(afterLatin.map(p => p[nameField])),
      lang === 'hu' ? t('list.filter.allNameHu') : t('list.filter.allNameEn'));
    searchName.refresh();

    const afterName = ddName.value
      ? afterLatin.filter(p => p[nameField] === ddName.value)
      : afterLatin;

    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
    searchVariety.refresh();
  }

  // Initialise all dependent dropdowns
  rebuildDependentDropdowns();

  // Lightweight rebuild used when only the name filter changes (only variety depends on it)
  function rebuildVarietyDropdown() {
    const afterFamily = ddFamily.value ? plants.filter(p => p.Family === ddFamily.value) : plants;
    const afterGenus  = ddGenus.value  ? afterFamily.filter(p => p.Genus === ddGenus.value) : afterFamily;
    const afterLatin  = ddLatin.value  ? afterGenus.filter(p => p.LatinName === ddLatin.value) : afterGenus;
    const afterName   = ddName.value   ? afterLatin.filter(p => p[nameField] === ddName.value) : afterLatin;
    buildDropdown(ddVariety, unique(afterName.flatMap(p => splitPipe(p.Name_Variety))), t('list.filter.allVarieties'));
    searchVariety.refresh();
  }

  // Apply URL params in hierarchical order so each level is valid before the next.
  // Also handle filterType/filterValue params produced by setIdentityFilterLink in P.html.
  const filterType  = params.get("filterType")  || "";
  const filterValue = params.get("filterValue") || "";

  let familyParam  = params.get("family")  || "";
  let genusParam   = params.get("genus")   || "";
  let latinParam   = params.get("latin")   || "";
  const nameHuParam  = params.get("nameHu")  || "";
  const nameEnParam  = params.get("nameEn")  || "";
  const varietyParam = params.get("variety") || "";

  if (filterValue) {
    if (filterType === "family") familyParam = filterValue;
    else if (filterType === "genus") genusParam = filterValue;
    else if (filterType === "latin") latinParam = filterValue;
  }

  if (familyParam)  { ddFamily.value = familyParam;  rebuildDependentDropdowns(); }
  if (genusParam)   { ddGenus.value  = genusParam;   rebuildDependentDropdowns(); }
  if (latinParam)   { ddLatin.value  = latinParam;   rebuildDependentDropdowns(); }
  if (lang === 'hu' && nameHuParam) { ddNameHu.value = nameHuParam; rebuildDependentDropdowns(); }
  if (lang === 'en' && nameEnParam) { ddNameEn.value = nameEnParam; rebuildDependentDropdowns(); }
  if (varietyParam) { ddVariety.value = varietyParam; }

  function updateFilterSummary() {
    const parts = [];
    if (ddFamily.value)  parts.push(`${t('list.filter.family')}: ${ddFamily.value}`);
    if (ddGenus.value)   parts.push(`${t('list.filter.genus')}: ${ddGenus.value}`);
    if (ddLatin.value)   parts.push(`${t('list.filter.latin')}: ${ddLatin.value}`);
    if (ddName.value)    parts.push(`${lang === 'hu' ? t('list.filter.nameHu') : t('list.filter.nameEn')}: ${ddName.value}`);
    if (ddVariety.value) parts.push(`${t('list.filter.variety')}: ${ddVariety.value}`);
    filterSummary.textContent = parts.length ? parts.join(" | ") : t('list.allPlants');
  }

  function applyDropdownFilters() {
    const result = plants.filter((p) => {
      if (ddFamily.value  && (p.Family       || "") !== ddFamily.value)  return false;
      if (ddGenus.value   && (p.Genus        || "") !== ddGenus.value)   return false;
      if (ddLatin.value   && (p.LatinName    || "") !== ddLatin.value)   return false;
      if (ddName.value    && (p[nameField]   || "") !== ddName.value)    return false;
      if (ddVariety.value && !splitPipe(p.Name_Variety).includes(ddVariety.value)) return false;
      return true;
    });
    updateFilterSummary();
    renderRows(result);
  }

  ddFamily.addEventListener("change",  () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddGenus.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddLatin.addEventListener("change",   () => { rebuildDependentDropdowns(); applyDropdownFilters(); });
  ddName.addEventListener("change",    () => { rebuildVarietyDropdown(); applyDropdownFilters(); });
  ddVariety.addEventListener("change", applyDropdownFilters);

  applyDropdownFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { setupLanguageButtons(); populate(); });
} else {
  setupLanguageButtons();
  populate();
}

