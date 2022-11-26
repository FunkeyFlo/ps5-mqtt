# Configuration

## Example Configuration
```yaml
mqtt: {}                            # [optional] MQTT connection info

logger: @ha:ps5:*                   # Will capture all events logged by PS5-MQTT

device_check_interval: 5000         # Recommended interval for checking device state

device_discovery_interval: 60000    # Recommended interval for discovering 'new' devices

include_ps4_devices: false          # Only enable if you only require awake/standby functionality

psn_accounts:                       # [optional] Add PSN accounts to match online activity to your devices
  - username: MyPsnUser            
    npsso: '!secret my_npsso'       # NPSSO token (expires after two months 😢)
    preferred_ps5: 70C881D600B0     # ID of the PS5 that will be preferred when activity can be matched to multiple PS5's 
    preferred_ps4: 60E899D600B0     # ID of the PS4 that will be preferred when activity can be matched to multiple PS4's

account_check_interval: 5000        # Recommended interval for checking account state (don't go lower than 3000!)
```

### `mqtt` *optional*
Optional [MQTT][mqtt-broker] connection information. 

If no information was provided the connection information will be acquired automatically.

```yaml
host: 192.168.0.2                   # (ip)address of your mqtt broker
port: '1883'                        # port of your mqtt broker
user: mqttuser                      # username used for connecting to your mqtt broker
pass: somepassword                  # password used for connecting to your mqtt broker
``` 

### `logger`
For logging the [debug][node-debug] npm module is used. This allows you to filter your log by certain topics.

### `device_check_interval`
Value in miliseconds that lets you change the frequency of scanning for PS5 state changes. 

### `device_discovery_interval`
Value in miliseconds that lets you change the frequency of discovering PS5 devices.

### `account_check_interval`
Value in miliseconds that lets you change the frequency of checking the online status of a PSN account.

*Be carefult! the PSN API's have a rate limit of 300 requests per 15 minutes. So don't go lower than 3000ms!*

### `include_ps4_devices` *optional*
If enabled (`true`) the add-on will also discover / allow the registration of Playstation 4 devices.

*NOTE: Playstation 4 devices **will only support Standy/Awake functionality**! If you want more functionality use the [HA integration for PS4][ha-ps4] instead!*

### `psn_account(s)` *optional*, *multiple*
The registered PSN accounts will be used by the application to track online activity and used to make a *best-effort* match on your device(s).

*NOTE: Without this information, you will not see "playing" status or what game you are playing!*

Follow [these steps][psn-api-auth] to get an NPSSO token. You can copy the below into the config editor in Home Assistant for correct formatting. You can get your PS5 ID from the PS5-MQTT Web UI page.

```yaml
- username: MyPsnUser                  # only a label, the API will retrieve the actual accountname with the npsso
  npsso: '!secret my_npsso'            # token used for authenticating with PSN API's
  preferred_ps5: 70C881D600B0          # ID of the PS5 that will be preferred when activity can be matched to multiple PS5's 
  preferred_ps4: 60E899D600B0          # ID of the PS4 that will be preferred when activity can be matched to multiple PS4's
```

*NOTE 1: The add-on does a best effort match to map PSN account activity to a device. This means that if you have multiple devices **and** you use the same account to game on both devices at the same time the add-on will match the activity to only one device.*

*NOTE 2: Unfortunatly, NPSSO tokens expire after two months which means you'll have to periodically get a new one.*

*NOTE 3: You don't have to use a `!secret` for the `npsso` token. But it is highly advised as it's basically a password.*


### `device_discovery_broadcast_address` *optional*
IP address the addon will use for UDP broadcasting which is required for device discovery.

If your devices are located on a VLAN you must use this option to point the addon to the broadcast ip of the VLAN your devices are located on.

*NOTE: only one broadcast address is supported. So all devices will need to be on the same VLAN.*

<!-- LINKS -->
[npsso]: https://ca.account.sony.com/api/v1/ssocookie
[ha-ps4]: https://www.home-assistant.io/integrations/ps4/
[node-debug]: https://github.com/debug-js/debug
[mqtt-broker]: https://www.home-assistant.io/integrations/mqtt/
[psn-api-auth]: https://psn-api.achievements.app/authentication/authenticating-manually#get-started
