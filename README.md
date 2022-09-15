
<div align="center">
    <img src="./add-ons/ps5-mqtt/logo.png" />
    <br>
    <br>
    <div style="display: flex;">
        <a href="https://github.com/FunkeyFlo/ps5-mqtt/releases">
            <img src="https://img.shields.io/github/release/FunkeyFlo/ps5-mqtt.svg">
        </a>
        <a href="https://www.paypal.com/donate/?hosted_button_id=VLDJUM2CMHMNG">
            <img src="https://img.shields.io/badge/Donate-PayPal-green.svg">
        </a>
        <a href="#">
            <img src="https://img.shields.io/maintenance/yes/2022.svg">
        </a>
        <a href="https://github.com/FunkeyFlo/ps5-mqtt/LICENSE.md">
            <img src="https://img.shields.io/github/license/hassio-addons/addon-ssh.svg">
        </a>
    </div>
    <h1>PS5 MQTT</h1>
</div>


Integrate your Sony Playstation 5 devices with Home Assistant using MQTT.

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

[![flat](https://dcbadge.vercel.app/api/server/BnmvYHvz5N?style=flat)][discord]

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FFunkeyFlo%2Fps5-mqtt)

## Features
The following features have been implemented or are planned for future implementation.

| Feature                                            | Implemented |
| -------------------------------------------------- | ----------- |
| Power; Wake/Standby (rest mode)                    | ✔           |
| Discover Playstation 5 devices on local network    | ✔           |
| [Web UI for acquiring credentials][credentials-ui] | ✔           |
| Match [PSN account activity][1.0.0] to device      | ✔           |

## Installation
1. Install an [MQTT broker][mqtt-broker], if you haven't already.
2. Add the repository to Home Assistant using the repository's url or by pressing the *add-repostory* button above.
3. Install the PS5 MQTT add-on. **Not the edge version!**.
4. Configure the add-on as described in the [documentation][ha-docs].
5. Start the add-on.
6. Use the web-ui to authenticate with each PlayStation device.

The MQTT entities will be created automatically when a new device is discovered on your network. 

*Note: this does require MQTT auto-discovery to be enabled.* 

## Using the add-on with Home Assistant Core (`Docker`)
This bit of [documentation][docker-docs] should get you on your way! 😻

## Support the project!
If you enjoy the project please consider donating to sponsor further development! 💕

<a href="https://www.buymeacoffee.com/funkeyflo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Example usage
![image](https://user-images.githubusercontent.com/4623715/184224674-97c167f6-44bc-463a-a573-3a47b5eaefc8.png)

## FAQ

### The log is showing 403 errors when I try to turn my ps5 on or off!
Double check that you've enabled all required remote play features [as described in the remote play documentation][ps5-rp].

### Why does this add-on only support Awake/Standby on Playstation 4?
There already is a great [Home Assistant integration][ha-ps4] that supports more functionality for PS4 devices like starting games. However, users have reported that this add-on detects Awake/Standby changes faster than the existing integration. So if you want you can use this add-on next to the existing integration or instead of it, if you are only interested in Standby/Awake.

### Can I get the yaml code for button in the [example image](#example-usage)?
**No.** I based my personal custom button cards on [this project][matt8707-dash]. *But* I *heavily* modified them and added loads of custom stuff that is not suitable for sharing at this time as it will likely raise more questions than provide answers.

## Thanks & Credits
The initial MQTT implementation for tracking device power was based on the work done by [andrew-codes][ac-user] and can be found in [this repository][ac-repo].

<!-- links -->
[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
[credentials-ui]: https://community.home-assistant.io/t/ps5-mqtt-control-playstation-5-devices-using-mqtt/441141#authentication-ui-v600-2
[discord]: https://discord.gg/BnmvYHvz5N
[docker-docs]: ./docs/DOCKER.md
[ha-docs]: ./add-ons/ps5-mqtt/DOCS.md
[ac-repo]: https://github.com/andrew-codes/home-automation
[ac-user]: https://github.com/andrew-codes
[matt8707-dash]: https://community.home-assistant.io/t/a-different-take-on-designing-a-lovelace-ui/162594
[mqtt-broker]: https://www.home-assistant.io/docs/mqtt/broker/
[ha-ps4]: https://www.home-assistant.io/integrations/ps4/
[ps5-rp]: https://remoteplay.dl.playstation.net/remoteplay/lang/en/ps5_mobile.html#section3
[1.0.0]: https://github.com/FunkeyFlo/ps5-mqtt/releases/tag/v1.0.0
