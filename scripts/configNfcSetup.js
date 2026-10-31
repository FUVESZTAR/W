/* config.js – loaded before the main script.
 * Everything here is still PUBLIC: anyone can open this file in the browser. */
const CFG = {
 // WRITER_URL: 'https://script.google.com/macros/s/AKfycbxUOhbupkL6UtMOv7zLxISSwwjx4nnvIrG0aUkmMmzPYK9t-envsS1e9zVVzoO6_OSS/exec',
  WRITER_URL: 'https://script.google.com/macros/s/AKfycbxHoDH4z-0LqO5C3JjBcvOUrafyUkwcZyOn0MHGclC8GkjGWvXXFNuAOYeNjNTQklBq/exec',
  SECRET: '159753g9d5rt4sdfer7e5z4d6szo89fsef', 
  SHEET_SOURCE_ID: '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY', 
  SHEET_SOURCE: 'plant_list',
  PLANT_Q: "select A, B, C, D, E, F where L = 'Y'",
  PIN_ID_QUERY: '?action=pinLastId',                          // GET that returns {lastId} for the Location saver page
};
