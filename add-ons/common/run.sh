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

# bashio returns the literal string "null" for unset optional config/service
# values instead of an empty string; normalize that back to empty here so
# downstream consumers (Node's mqtt client, etc.) don't treat it as a real value.
[ "$MQTT_PORT" = "null" ] && export MQTT_PORT=""
[ "$MQTT_USERNAME" = "null" ] && export MQTT_USERNAME=""
[ "$MQTT_PASSWORD" = "null" ] && export MQTT_PASSWORD=""

if [ -z "$MQTT_HOST" ] || [ "$MQTT_HOST" = "null" ]; then
    bashio::log.fatal "No MQTT broker could be found or configured."
    bashio::log.fatal "Install/configure an MQTT broker (e.g. the Mosquitto broker add-on) so it can be auto-discovered,"
    bashio::log.fatal "or set the 'mqtt' options (host, port, user, pass) in this add-on's Configuration tab."
    bashio::exit.nok
fi

export FRONTEND_PORT=8645
if [ ! -z $(bashio::addon.ingress_port) ]; then
    FRONTEND_PORT=$(bashio::addon.ingress_port)
fi

# configure logger
export DEBUG="*,-mqttjs*,-mqtt-packet*,-playactor:*,-@ha:state*,-@ha:ps5:poll*,-@ha:ps5:check*"

logger=$(bashio::config 'logger')
if [ -n "$logger" ] && [ "$logger" != "null" ]; then
    DEBUG="$logger"
fi

echo Starting PS5-MQTT...
node app/ps5-mqtt/server/dist/index.js