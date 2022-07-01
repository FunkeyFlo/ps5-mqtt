#!/usr/bin/env bashio

export MQTT_HOST=$(bashio::config 'mqtt.host')
export MQTT_PORT=$(bashio::config 'mqtt.port')
export MQTT_USERNAME=$(bashio::config 'mqtt.user')
export MQTT_PASSWORD=$(bashio::config 'mqtt.pass')

echo Creating ps5 credentials file!
node app/create-credentials.js "$(bashio::config 'ps5_credentials')"

echo Starting PS5 MQTT Client
node app/dist/index.js