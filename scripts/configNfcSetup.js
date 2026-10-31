/* config.js – loaded before the main script.
 * Everything here is still PUBLIC: anyone can open this file in the browser. */
const CFG = {
 // WRITER_URL: 'https://script.google.com/macros/s/AKfycbxUOhbupkL6UtMOv7zLxISSwwjx4nnvIrG0aUkmMmzPYK9t-envsS1e9zVVzoO6_OSS/exec',
  WRITER_URL: 'https://script.google.com/macros/s/AKfycbwG21tJU7SJWq02bhbE8B2fKUxM7ucmgBAjKf5iUB80xk6Vidz7siBYU86onwXLlpcS/exec',
  SECRET: '159753g9d5rt4sdfer7e5z4d6szo89fsef', 
  READ_SHEET_SOURCE_ID: '1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY', 
  READ_SHEET_SOURCE: 'plant_list',
  WRITE_SHEET_SOURCE_ID: '1nxRfS0k4zoX7SFlLefuUlPlgDpBZCNkRzxirR1CDGtE',
  WRITE_SHEET_SOURCE_NFC: 'nfc_list',
  WRITE_SHEET_SOURCE_PIN: 'pin_list',
  WRITE_SHEET_SOURCE_REG: 'reg_list',
  PLANT_Q: "select A, B, C, D, E, F where L = 'Y'",
  PIN_ID_QUERY: '?action=pinLastId',                          // GET that returns {lastId} for the Location saver page
 
};

