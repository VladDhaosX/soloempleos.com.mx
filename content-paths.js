const path = require('path');

const APP_ROOT = __dirname;
const PAGES_DIR = path.join(APP_ROOT, 'pages');
const ADMIN_DIR = path.join(APP_ROOT, 'admin');
const CONTENT_DIR = process.env.CONTENT_DIR
  ? path.resolve(APP_ROOT, process.env.CONTENT_DIR)
  : path.join(APP_ROOT, 'storage');
const REGIONS = ['gdl', 'mty'];

function contentPath(...parts) {
  return path.join(CONTENT_DIR, ...parts);
}

function dataPath(region, filename) {
  return contentPath(region, 'data', filename);
}

function uploadsPath(region, type, filename = '') {
  return contentPath(region, 'uploads', type, filename);
}

module.exports = {
  ADMIN_DIR,
  APP_ROOT,
  CONTENT_DIR,
  PAGES_DIR,
  REGIONS,
  contentPath,
  dataPath,
  uploadsPath,
};
