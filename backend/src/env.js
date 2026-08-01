const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

function loadEnv() {
  const candidatePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }
}

loadEnv();

module.exports = { loadEnv };
