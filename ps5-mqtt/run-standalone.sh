#!/bin/sh
set -e

echo Starting PS5-MQTT...
node app/server/dist/index.js

echo PS5-MQTT exited, shutdown now.

exit 0
