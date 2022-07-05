# Configuration

## Example Configuration
```yaml
ps5_credentials: >-
  {"78C88...":{"app-type":"r","auth-type":"R","client-type":"vr","model":"w","user-credential":"36329...","accountId":"4....","registration":{"AP-Bssid":"313...","AP-Name":"PS5","PS5-Mac":"78c881...","PS5-RegistKey":"6438386....","PS5-Nickname":"PS5-087","RP-KeyType":"2","RP-Key":"008664a2c57b2045...."}}}
mqtt:
  host: 192.168.0.2
  port: '1883'
  user: mqttuser
  pass: somepassword
logger: >-
  *,-mqttjs*,-mqtt-packet*,-playactor:*,-@ha:state*,-@ha:ps5:poll*,-@ha:ps5:check*
device_check_interval: 1000
```

### ps5_credentials

Unfortunately, the feature for acquiring the required credentials to communicate with your Playstation device is not *yet* supported through the add-on itself.
<br>
So for now you will have to create the credentials using the [playactor cli](https://github.com/dhleong/playactor). To use the Playactor CLI you will have to install node.js. You can generate the credentials using the following command:

```
playactor login
```

If succesful, this will create a `credentials.json` file located at `~/.config/playactor/credentials.json`.

Afterwards paste the contents of the credentials file in the add-on config.

### mqtt
[MQTT](https://www.home-assistant.io/integrations/mqtt/) connection information.

### logger
For logging the [debug](https://github.com/debug-js/debug) npm module is used. This allows you to filter your log by certain topics.

### device_check_interval
Value in miliseconds that lets you change the frequency of scanning for PS5 state changes. 