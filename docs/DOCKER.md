# Using the app with Docker (HA Core)
There are multiple ways of using the `Docker` images created by this project with HA Core.

This bit of documentation will outline one of those methods. Namely by creating your own startup script file.

## Prerequisites
This document assumes:
1. That you have a basic understanding of how to use docker and `docker-compose.yml` files.
2. That you know which **architecture** your docker instance is running on. The app supports 5 architecture types which you can find here. *You will need this in the steps described below.*
3. A linux-based docker host. The app relies on the `network_mode: host` option of docker to function and unfortunatly this option is only available on linux and not mac or windows as you can see [here][network-mode-windows].

## Steps
The following steps describe how you can use a `docker-compose.yml` and a custom `run.sh` file to start the add-on.

This allows you to circumvent the default startup command, which depends on [bashio][bashio], which is only available when using the app as a Home Assistant Add-on. And instead provide the required configuration through the `.sh` file we will create.
<br><br>

*Directory structure of the example.*
```
.  
│
├─── customizations             # we will need a separate directory to use as a volume
│    │
│    └─── run.sh                # custom startup script
│   
└─── docker-compose.yml         # configuration of our container
```

### 1. Create a `docker-compose.yml` file
Create a `docker-compose.yml` file with the following contents.

The example uses the architecture "`amd64`" in the `image` reference, but you should of course adapt this to match that of the instance that you're running docker on.

You can find the available images [here][docker-images].

```yaml
version: '3'

services:
  ps5-mqtt:
    container_name: PS5-MQTT                            # choose whatever name you like
    image: ghcr.io/funkeyflo/ps5-mqtt/amd64:0.7.1       # do not use 'latest' as this might result in using a 'edge' (beta) version
    entrypoint: /customizations/run.sh                  # the file that will be executed at startup
    volumes:                                            # we will use this volume to get our custom startup script into the container
      - ./customizations:/customizations                
    network_mode: host                                  # changing/omiting this option WILL BREAK the app.
    environment:
      - MQTT_HOST=192.168.0.132                         # (ip)address of your mqtt broker
      - MQTT_PORT=1883                                  # port of your mqtt broker
      - MQTT_USERNAME=mqttuser                          # username used for connecting to your mqtt broker
      - MQTT_PASSWORD=mqttpassword                      # password used for connecting to your mqtt broker

      - DEVICE_CHECK_INTERVAL=5000
      - DEVICE_DISCOVERY_INTERVAL=60000

      - FRONTEND_PORT=8645

      - CREDENTIAL_STORAGE_PATH=/config/ps5-mqtt/credentials.json
      - DEBUG=@ha:ps5:*
```

*NOTE 1: at the time of writing version `0.7.1` was the latest stable release.*<br>
*NOTE 2: for more information on configuration variables please refer to the [add-on docs][add-on-docs] and the [regular startup script][regular-startup-script].*


### 2. Create a startup file
The only thing we have to do here is to simply point the app to the server executable using `node.js`.

```sh
#!/bin/sh
set -e

echo Starting PS5-MQTT...
node app/server/dist/index.js
```

## Need help or have a comment?
- Can't figure out how to setup the component? Please consult our [discord] community!
- See something in the documentation that's incorrect or missing? [Create an issue][github-issues] on github!

<!-- links -->
[bashio]: https://github.com/hassio-addons/bashio
[arch-types]: ../add-ons/common/build.yaml
[docker-images]: https://github.com/FunkeyFlo?tab=packages&repo_name=ps5-mqtt
[add-on-docs]: ../add-ons/ps5-mqtt/DOCS.md
[regular-startup-script]: ../ps5-mqtt/run.sh
[network-mode-windows]: https://stackoverflow.com/questions/48915458/windows-run-docker-with-network-host-and-access-with-127-0-0-1
[discord]: https://discord.com/invite/BnmvYHvz5N
[github-issues]: https://github.com/FunkeyFlo/ps5-mqtt/issues/new/choose