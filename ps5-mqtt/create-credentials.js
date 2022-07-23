const os = require('os');
const path = require('path');
const process = require('process');
const fs = require('fs');

const credentialsValue = process.argv[2];

fs.writeFileSync(path.join(os.homedir(), '.config', 'playactor', 'credentials.json'), credentialsValue, { encoding: 'utf-8' });