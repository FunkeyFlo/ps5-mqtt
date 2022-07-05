## 0.4.3
- Changed config to ensure mqtt is ready before service starts.

## 0.4.3
- Changed device discovery to only run once during startup to reduce CPU usage. To discover new devices you will have to restart the add-on.
- Added `device_check_interval` option to change the frequency of checking the PS5's status.
- Reduced the frequency of mqtt updates by only sending an update when device state actually changed.
- Added a delay between device registration in Home Assistant and sending the first availability update to solve [issue](https://github.com/FunkeyFlo/ps5-mqtt/issues/1) where after discovery the power entity would remain unavailable.