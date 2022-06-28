#!/bin/bash
set -e

CONFIG_PATH=/data/options.json

MQTT_HOST="$(jq --raw-output '.mqtt.host')"
MQTT_PORT="$(jq --raw-output '.mqtt.port')"
MQTT_USERNAME="$(jq --raw-output '.mqtt.user')"
MQTT_PASSWORD="$(jq --raw-output '.mqtt.pass')"

echo Creating ps5 credentials file!
node app/create-credentials.js "$(jq --raw-output '.ps5_credentials')" "~/.config/playactor/credentials.json"

echo Starting PS5 MQTT Client
node app/dist/index.js