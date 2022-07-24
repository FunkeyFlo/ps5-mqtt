#!/usr/bin/env bashio

export MQTT_HOST=$(bashio::config 'mqtt.host')
export MQTT_PORT=$(bashio::config 'mqtt.port')
export MQTT_USERNAME=$(bashio::config 'mqtt.user')
export MQTT_PASSWORD=$(bashio::config 'mqtt.pass')

export DEVICE_CHECK_INTERVAL=$(bashio::config 'device_check_interval')
export DEVICE_DISCOVERY_INTERVAL=$(bashio::config 'device_discovery_interval')

export FRONTEND_PORT=8645

export CREDENTIAL_STORAGE_PATH="/config/ps5-mqtt/credentials.json"

export DEBUG="*,-mqttjs*,-mqtt-packet*,-playactor:*,-@ha:state*,-@ha:ps5:poll*,-@ha:ps5:check*"

if [ ! -z $(bashio::config 'logger') ]; then
    DEBUG=$(bashio::config 'logger')
fi

if [ -n "$(bashio::config 'ps5_credentials')" ]; then
    node app/create-credentials.js "$(bashio::config 'ps5_credentials')"
fi

echo Starting PS5-MQTT...
node app/server/dist/index.js