# Configuration

## Example Configuration
```yaml
# !! This is NOT for connecting to your PS5, but for connecting to an MQTT broker !!
mqtt:
  host: 192.168.0.2
  port: '1883'
  user: mqttuser
  pass: somepassword

logger: "@ha:ps5:*"

device_check_interval: 5000
device_discovery_interval: 60000
```

### ⚠ *DEPRECATED* `ps5_credentials` 
*This configuration option was deprecated in release 0.6.0 and will be removed with the next minor version release. For future releases use the Web UI to authenticate with your PS5.*
<br>
*Or if you **really** want to bring your own credentials put them in the file `/config/ps5-mqtt/credentials.json`*

~~Unfortunately, the feature for acquiring the required credentials to communicate with your Playstation device is not *yet* supported through the add-on itself.
<br>
So for now you will have to create the credentials using the [playactor cli](https://github.com/dhleong/playactor). To use the Playactor CLI you will have to install node.js. You can generate the credentials using the following command:~~

```
playactor login
```

If succesful, this will create a `credentials.json` file located at `~/.config/playactor/credentials.json`.

~~Afterwards paste the contents of the credentials file in the add-on config.~~

### `mqtt`
MQTT connection information. Set up [an MQTT broker](https://www.home-assistant.io/integrations/mqtt/) if you haven't done so yet! 

### `logger`
For logging the [debug](https://github.com/debug-js/debug) npm module is used. This allows you to filter your log by certain topics.

### `device_check_interval`
Value in miliseconds that lets you change the frequency of scanning for PS5 state changes. 

### `device_discovery_interval`
Value in miliseconds that lest you change the frequency of discovering PS5 devices.