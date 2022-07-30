## 0.6.4 - 2022-07-30

### What’s changed

- client improvements @FunkeyFlo (#19)
- - added dark/light theme option to client UI 🌗
- - (hopefully) cleared up some of the confusion people were having with the authentication steps by changing the walkthrough text that's displayed in the Authorization dialog.
- 

## 0.6.3

- Switched to images instead of locally built Dockerfiles [#3](https://github.com/FunkeyFlo/ps5-mqtt/issues/3).

### **⚠ IMPORTANT FOR USERS UPGRADING FROM `v0.6.2` ⚠**

Because the add-on switched from locally built Dockerfiles to pre-built images you *have* to **uninstall** and **re-install** the add-on to upgrade! ⚠ Be sure to backup your configuration first because Home Assistant *will not* save it for you!

## 0.6.2

- Added a Web UI to acquire credentials through the Add-on itself.
- Credentials file will now be written to the file `/config/ps5-mqtt/credentials.json`.
- ⚠ **Deprecation Warning**
- - The `ps5_credentials` option is deprecated and will be removed with the next *[minor](https://semver.org/)* release. Check the [docs](/ps5-mqtt/DOCS.md) for migration options.
- 

## 0.5.2

- Fixed issue where MQTT traffic could cause a loop, starving the MQTT broker.

## 0.5.0

- Changed MQTT implementation to...
- - ...reduce amount of messages being sent.
- - ...avoid entities being unavailable after home assistant restart. ([#5](https://github.com/FunkeyFlo/ps5-mqtt/issues/5))
- 
- Re-implemented device discovery
- - Added `device_discovery_interval` option to change the frequency of discovering PS5 devices.
- - Optimizations for discovered devices.
- 
- Various minor tweaks and improvements.

## 0.4.4

- Changed config to ensure mqtt is ready before service starts.

## 0.4.3

- Changed device discovery to only run once during startup to reduce CPU usage. To discover new devices you will have to restart the add-on.
- Added `device_check_interval` option to change the frequency of checking the PS5's status.
- Reduced the frequency of mqtt updates by only sending an update when device state actually changed.
- Added a delay between device registration in Home Assistant and sending the first availability update to solve [issue](https://github.com/FunkeyFlo/ps5-mqtt/issues/1) where after discovery the power entity would remain unavailable.
