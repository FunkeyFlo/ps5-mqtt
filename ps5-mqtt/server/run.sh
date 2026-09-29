#!/bin/sh
set -e

echo Starting PS5-MQTT...
exec node app/ps5-mqtt/server/dist/index.js

