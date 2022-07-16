## 0.5.0
- Changed MQTT implementation to...
  - ...reduce amount of messages being sent.
  - ...avoid entities being unavailable after home assistant restart. ([#5](https://github.com/FunkeyFlo/ps5-mqtt/issues/5))
- Re-implemented device discovery
  - Added `device_discovery_interval` option to change the frequency of discovering PS5 devices.
  - Optimizations for discovered devices.
- Various minor tweaks and improvements.

## 0.4.4
- Changed config to ensure mqtt is ready before service starts.

## 0.4.3
- Changed device discovery to only run once during startup to reduce CPU usage. To discover new devices you will have to restart the add-on.
- Added `device_check_interval` option to change the frequency of checking the PS5's status.
- Reduced the frequency of mqtt updates by only sending an update when device state actually changed.
- Added a delay between device registration in Home Assistant and sending the first availability update to solve [issue](https://github.com/FunkeyFlo/ps5-mqtt/issues/1) where after discovery the power entity would remain unavailable.
