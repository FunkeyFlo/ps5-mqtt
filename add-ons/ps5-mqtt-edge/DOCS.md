# Configuration

## Example Configuration
```yaml
mqtt: {}                            # optional MQTT connection info
logger: @ha:ps5:*                   # will capture all events logged by PS5-MQTT
device_check_interval: 5000         # recommended interval
device_discovery_interval: 60000    # recommended interval
```

### `mqtt` *optional*
Optional [MQTT](https://www.home-assistant.io/integrations/mqtt/) connection information. 

If no information was provided the connection information will be acquired automatically.

```yaml
host: 192.168.0.2
port: '1883'
user: mqttuser
pass: somepassword
``` 

### `logger`
For logging the [debug](https://github.com/debug-js/debug) npm module is used. This allows you to filter your log by certain topics.

### `device_check_interval`
Value in miliseconds that lets you change the frequency of scanning for PS5 state changes. 

### `device_discovery_interval`
Value in miliseconds that lest you change the frequency of discovering PS5 devices.