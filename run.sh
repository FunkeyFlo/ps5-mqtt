#!/usr/bin/with-contenv bashio
set -e

node create-credentials.js $(bashio::config "ps5_credentials") ~/.config/playactor/credentials.json

MQTT_HOST=$(bashio::config "mqtt.host")
MQTT_PORT=$(bashio::config "mqtt.port")
MQTT_USERNAME=$(bashio::config "mqtt.user")
MQTT_PASSWORD=$(bashio::config "mqtt.pass")

node app/dist/index.js