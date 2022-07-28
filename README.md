
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
| Web UI for managing devices                        | ❌           |


## Support the project!
If you enjoy the project please consider donating to sponsor further development! 💕

<a href="https://www.buymeacoffee.com/funkeyflo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## FAQ

### I'm trying to update to version `0.6.3` but the installation is failing!
Version `0.6.3` saw a switch from locally built Dockerfiles to pre-built images. Supervisor seems to not handle this upgrade properly. Instead you'll have to uninstall the add-on first and then re-install. You can follow the steps described in the [edge version documentation](https://github.com/FunkeyFlo/ps5-mqtt/tree/main/add-ons/ps5-mqtt-edge#updating-the-edge-add-on) for this.

### The log is showing 403 errors when I try to turn my ps5 on or off!
Double check that you've enabled all required remote play features [as described in the remote play documentation](https://remoteplay.dl.playstation.net/remoteplay/lang/en/ps5_mobile.html#section3).

### Why doesn't this add-on support Playstation 4 devices?
Because there is a great [Home Assistant integration](https://www.home-assistant.io/integrations/ps4/) that does this job already!

## Thanks & Credits
The majority of the MQTT implementation was based on the work done by [andrew-codes](https://github.com/andrew-codes) and can be found in [this repository](https://github.com/andrew-codes/home-automation).

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg

[credentials-ui]: https://community.home-assistant.io/t/ps5-mqtt-control-playstation-5-devices-using-mqtt/441141#authentication-ui-v600-2
[discord]: https://discord.gg/BnmvYHvz5N