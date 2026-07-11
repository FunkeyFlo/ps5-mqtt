#!/bin/sh
set -e

echo Starting PS5-MQTT...
node app/ps5-mqtt/server/dist/index.js

echo PS5-MQTT exited, shutdown now.

exit 0
