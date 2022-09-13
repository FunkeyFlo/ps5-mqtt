#!/usr/bin/env bashio

export CONFIG_PATH="/data/options.json"
export CREDENTIAL_STORAGE_PATH="/config/ps5-mqtt/credentials.json"

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

export FRONTEND_PORT=8645
if [ ! -z $(bashio::addon.ingress_port) ]; then
    FRONTEND_PORT=$(bashio::addon.ingress_port)
fi

# configure logger
export DEBUG="*,-mqttjs*,-mqtt-packet*,-playactor:*,-@ha:state*,-@ha:ps5:poll*,-@ha:ps5:check*"

if [ ! -z $(bashio::config 'logger') ]; then
    DEBUG=$(bashio::config 'logger')
fi

echo Starting PS5-MQTT...
node app/server/dist/index.js