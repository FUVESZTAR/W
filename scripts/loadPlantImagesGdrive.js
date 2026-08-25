// ── Google Drive config ──────────────────────────────────────────────
// Fill these in once.
// 1. Create an API key in Google Cloud Console, enable the Drive API,
//    restrict the key to Drive API (+ HTTP referrer = your domain).
// 2. Create one folder in Drive named e.g. "plantImage", share it as
//    "Anyone with the link — Viewer", copy its folder ID from the URL.
// 3. Upload images into that single folder, named like:
//    malus_domestica_gala_1.jpg, malus_domestica_gala_2.jpg, ...
//    i.e. normalizeName(LatinName + "_" + Name_Variety) + "_" + running number

const APPS_SCRIPT_URL ='https://script.google.com/macros/s/AKfycbxxwaaITsAj_KN-d5RPZFBlfjLPtAA9f7Vwar7xTHPac4o_GXQEE_woiiv8E0V3q4Ok/exec';

function driveImageUrl(fileId, size = 'w1000') {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
}


async function loadPlantImage(plant) {

  carouselInit();


  // ----------------------------------------------------------
  // Build search name
  // ----------------------------------------------------------

  const searchLatin =
    (plant.LatinName || '')
      .trim()
      .replace(/\s+/g, '_');


  const searchVariety =
    (plant.Name_Variety || '')
      .trim()
      .replace(/\s+/g, '_');


  const imgText =
    `${searchLatin}_${searchVariety}`;


  const searchId =
    normalizeName(imgText);


  console.log(
    'Search image:',
    searchId
  );


  // Reset carousel

  _carouselImages = [];

  _carouselIndex = 0;


  // ----------------------------------------------------------
  // 1. Google Drive via Apps Script
  // ----------------------------------------------------------

  try {

    const url =
      `${APPS_SCRIPT_URL}?search=${encodeURIComponent(searchId)}`;


    console.log(
      'Requesting:',
      url
    );


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `Apps Script request failed: ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      data.success &&
      data.images &&
      data.images.length
    ) {

      _carouselImages =
        data.images.map(file => ({

          src: file.url,

          name: extractImageName(
            file.name
          )

        }));


      console.log(
        `Found ${_carouselImages.length} Drive image(s)`
      );


      carouselRender();

      return;
    }


    console.log(
      'No Google Drive images found'
    );


  } catch (error) {

    console.warn(
      'Google Drive lookup failed:',
      error
    );

  }


  // ----------------------------------------------------------
  // 2. Wikipedia fallback
  // ----------------------------------------------------------

  try {

    const wikiResponse =
      await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchLatin)}`
      );


    if (!wikiResponse.ok) {

      throw new Error(
        'Wikipedia request failed'
      );

    }


    const wikiData =
      await wikiResponse.json();


    const src =
      wikiData.thumbnail?.source ||
      wikiData.originalimage?.source ||
      null;


    if (src) {

      _carouselImages = [

        {
          src: src,

          name: extractImageName(src)
        }

      ];


      carouselRender();

      return;
    }


  } catch (error) {

    console.warn(
      'Wikipedia image lookup failed:',
      error
    );

  }


  // ----------------------------------------------------------
  // 3. Default image
  // ----------------------------------------------------------

  _carouselImages = [

    {
      src: 'images/default.jpg',

      name: 'Default image'
    }

  ];


  carouselRender();
}

function normalizeName(value) {

  return String(value || '')
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

}
