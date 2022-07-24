const path = require('path');
const process = require('process');
const fs = require('fs');

const credentialsValue = process.argv[2];

try {
    if (isCredentialsJson(credentialsValue)) {
        console.log('Creating PS5 credentials file...')
        fs.mkdirSync('/config/ps5-mqtt', { recursive: true });

        fs.writeFileSync(
            path.join('/config/ps5-mqtt/credentials.json'),
            credentialsValue,
            { encoding: 'utf-8' }
        );
    }
} catch (e) {
    console.error('Error occured while creating credentials:', e)
}

function isCredentialsJson(value) {
    try {
        const result = JSON.parse(value);
        return Object.keys(result)[0]['user-credential'] !== undefined;
    } catch(e) { }
    return false
}