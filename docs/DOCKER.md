# Using the app with Docker (HA Core)
This document describes the *recommended way* of using the `Docker` images created by this project with HA Core.

## Prerequisites
This document assumes:
1. That you have a basic understanding of how to use docker and `docker-compose.yml` files.
2. That you know which **architecture** your docker instance is running on. The app supports 5 architecture types which you can find here. *You will need this in the steps described below.*
3. A linux-based docker host. The app relies on the `network_mode: host` option of docker to function and unfortunatly this option is only available on linux and not mac or windows as you can see [here][network-mode-windows].

## Steps
The following steps describe how you can use a `docker-compose.yml` to setup the add-on.

*Directory structure of the example.*
```
.  
│
├─── config                # we will use this folder as a volume for persisting credentials
│    │
│    └─── options.json*    # optional config file used to provide settings via .json rather than env. variables.
│   
└─── docker-compose.yml    # configuration of our container
```

### Creating the `docker-compose.yml` file
Create a `docker-compose.yml` file with the following contents.

The example uses the architecture "`amd64`" in the `image` reference, but you should of course adapt this to match the architecture of the instance that you're running docker on.

You can find the available images [here][docker-images].

#### Option 1: configuring the app through environment variables

**`docker-compose.yml` example 1**
```yaml
version: '3'

services:
  ps5-mqtt:
    container_name: PS5-MQTT                            # choose whatever name you like
    image: ghcr.io/funkeyflo/ps5-mqtt/amd64:latest      # you can also use a specific version
    entrypoint: /app/run-docker.sh                      # startup script without dependencies on home assistant supervisor
    volumes:                                            # a volume is required to persist credentials
      - ./config:/config
    network_mode: host                                  # changing/omiting this option WILL BREAK the app.
    environment:
      - MQTT_HOST=192.168.0.132                         # (ip)address of your mqtt broker
      - MQTT_PORT=1883                                  # port of your mqtt broker
      - MQTT_USERNAME=mqttuser                          # username used for connecting to your mqtt broker
      - MQTT_PASSWORD=mqttpassword                      # password used for connecting to your mqtt broker

      - DEVICE_CHECK_INTERVAL=5000
      - DEVICE_DISCOVERY_INTERVAL=60000
      - ACCOUNT_CHECK_INTERVAL=5000

      - 'PSN_ACCOUNTS=[{"username": "MyPsnUser", "npsso":"npsso_value"}]'

      - INCLUDE_PS4_DEVICES=false

      - FRONTEND_PORT=8645

      - CREDENTIAL_STORAGE_PATH=/config/credentials.json
      - DEBUG=@ha:ps5:*
```

*NOTE: for more information on configuration variables please refer to the [add-on docs][add-on-docs] and the [regular startup script][regular-startup-script].*

#### Option 2. configuring the app with a `json` file.

`docker-compose.yml` example 2
```yaml
version: '3'

services:
  ps5-mqtt:
    # ...
    # same as Option 1.
    # ...
    volumes:
      - ./config:/config
    # ...
    environment:
      - CONFIG_PATH=/config/options.json
      - DEBUG=@ha:ps5:*
```

**`options.json` example**
```json
{
  "mqtt": {
      "host": "192.168.0.132",
      "port": "1883",
      "user": "mqttuser",
      "pass": "mqttpassword"
  },

  "device_check_interval": 5000,
  "device_discovery_interval": 60000,

  "include_ps4_devices": false,

  "psn_accounts": [
    {
      "username": "MyPsnUser", 
      "npsso":"npsso_value"
    }
  ],

  "account_check_interval": 5000,

  "credentialsStoragePath": "/config/credentials.json",
  "frontendPort": "8645"
}
```

NOTE: you can also combine `json` config and environment variables. If duplicate values are detected the environment variable value wins.

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
