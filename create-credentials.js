const process = require('process');
const fs = require('fs');

const credentialsValue = process.argv[2];
const credentialsPath = process.argv[3];

fs.writeFileSync(credentialsPath, credentialsValue, { encoding: 'utf-8' });