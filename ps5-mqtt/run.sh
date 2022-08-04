#!/usr/bin/env bashio

if bashio::config.is_empty 'mqtt' && bashio::var.has_value "$(bashio::services 'mqtt')"; then
    export MQTT_HOST="$(bashio::services 'mqtt' 'host')"
    export MQTT_PORT="$(bashio::services 'mqtt' 'port')"
    export MQTT_USERNAME="$(bashio::services 'mqtt' 'username')"
    export MQTT_PASSWORD="$(bashio::services 'mqtt' 'password')"
else 
    export MQTT_HOST=$(bashio::config 'mqtt.host')
    export MQTT_PORT=$(bashio::config 'mqtt.port')
    export MQTT_USERNAME=$(bashio::config 'mqtt.user')
    export MQTT_PASSWORD=$(bashio::config 'mqtt.pass')
fi

export DEVICE_CHECK_INTERVAL=$(bashio::config 'device_check_interval')
export DEVICE_DISCOVERY_INTERVAL=$(bashio::config 'device_discovery_interval')

export INCLUDE_PS4_DEVICES=$(bashio::config 'include_ps4_devices')

export FRONTEND_PORT=8645
if [ ! -z $(bashio::addon.ingress_port) ]; then
    FRONTEND_PORT=$(bashio::addon.ingress_port)
fi

export CREDENTIAL_STORAGE_PATH="/config/ps5-mqtt/credentials.json"

export DEBUG="*,-mqttjs*,-mqtt-packet*,-playactor:*,-@ha:state*,-@ha:ps5:poll*,-@ha:ps5:check*"

if [ ! -z $(bashio::config 'logger') ]; then
    DEBUG=$(bashio::config 'logger')
fi

echo Starting PS5-MQTT...
node app/server/dist/index.js