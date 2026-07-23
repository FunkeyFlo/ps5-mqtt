import { configureStore } from "@reduxjs/toolkit"
import MQTT from "async-mqtt"
import createDebugger from "debug"
import os from "os"
import path from "path"
import createSagaMiddleware from "redux-saga"

import { AppConfig, getAppConfig } from "./config"
import { createPlayactorClient } from "./playactor/client"
import { PsnAccount } from "./psn-account"
import reducer, {
  getDeviceRegistry,
  pollDevices,
  pollDiscovery,
  pollPsnPresence,
  registerDevice,
  saga,
  setPowerMode,
  updateAccount,
} from "./redux"
import { Dispatch, SwitchStatus } from "./redux/types"
import { MQTT_CLIENT, PLAYACTOR_CLIENT, Settings, SETTINGS } from "./services"
import { createErrorLogger } from "./util/error-logger"
import { setupWebserver } from "./web-server"

const debug = createDebugger("@ha:ps5")
const debugMqtt = createDebugger("@ha:ps5:mqtt")
const debugState = createDebugger("@ha:state")
const logError = createErrorLogger()

const createMqtt = async (
  appConfig: AppConfig,
): Promise<MQTT.AsyncMqttClient> => {
  return await MQTT.connectAsync(`mqtt://${appConfig.mqtt.host}`, {
    password: appConfig.mqtt.pass,
    port: parseInt(appConfig.mqtt.port || "1883", 10),
    username: appConfig.mqtt.user,
    reconnectPeriod: 2000,
    connectTimeout: 3 * 60 * 1000, // 3 minutes
  })
}

// Bootstraps each configured PSN account and dispatches it via
// UPDATE_PSN_ACCOUNT, which both populates it into the store (the reducer
// keys accounts by accountId) and triggers the persist-psn-account saga to
// mirror it to disk — the same path a periodic presence-check refresh goes
// through. Requires the store/saga middleware to already be running.
// Returns how many accounts were bootstrapped successfully.
async function bootstrapPsnAccounts(
  accounts: AppConfig.PsnAccountInfo[],
  dispatch: Dispatch,
): Promise<number> {
  let successCount = 0
  for (const accountInfo of accounts) {
    try {
      const account = await PsnAccount.exchangeNpssoForPsnAccount(
        accountInfo.npsso,
        accountInfo.username,
        dispatch,
      )
      dispatch(
        updateAccount({
          ...account,
          preferredDevices: {
            ps4: accountInfo.preferred_ps4,
            ps5: accountInfo.preferred_ps5,
          },
        }),
      )
      successCount += 1
    } catch (e) {
      logError(e)
      logError(
        `Account '${accountInfo.username ?? "unknown"}' retrieval failed. Activity for this account will not be tracked.`,
      )
    }
  }
  return successCount
}

export async function run() {
  const appConfig = getAppConfig()
  createDebugger("@ha:ps5-sensitive:parsed-config")(appConfig)

  debug("Started")

  debug("Establishing MQTT Connection...")
  const mqtt: MQTT.AsyncMqttClient = await createMqtt(appConfig)
  debug("Connected to MQTT Broker!")

  const settings: Settings = {
    // polling intervals
    checkDevicesInterval: appConfig.device_check_interval || 5000,
    checkAccountInterval: appConfig.account_check_interval || 5000,
    discoverDevicesInterval: appConfig.device_discovery_interval || 60000,

    credentialStoragePath:
      appConfig.credentialsStoragePath ??
      path.join(os.homedir(), ".config", "playactor", "credentials.json"),
    allowPs4Devices: appConfig.include_ps4_devices ?? true,

    loginPasscode: appConfig.login_passcode,

    deviceDiscoveryBroadcastAddress:
      appConfig.device_discovery_broadcast_address,

    discoveryTopic: appConfig.mqtt.discovery_topic,
  }

  const playactorClient = createPlayactorClient({
    credentialStoragePath: settings.credentialStoragePath,
    loginPasscode: settings.loginPasscode,
  })

  try {
    const sagaMiddleware = createSagaMiddleware({
      context: {
        [MQTT_CLIENT]: mqtt,
        [SETTINGS]: settings,
        [PLAYACTOR_CLIENT]: playactorClient,
      },
    })
    const store = configureStore({
      reducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      preloadedState: {
        devices: {},
        accounts: {},
      },
    })
    store.subscribe(() => {
      debugState(JSON.stringify(store.getState(), null, 2))
    })
    sagaMiddleware.run(saga)

    // Bootstrapping accounts dispatches through the store (persist-psn-account
    // saga included), so it can only happen once the store/saga middleware
    // above are running.
    const accountCount = await bootstrapPsnAccounts(
      appConfig.psn_accounts ?? [],
      store.dispatch,
    )
    createDebugger("@ha:ps5-sensitive:registered-accounts")(
      store.getState().accounts,
    )

    // Seed any statically-configured devices so they're controllable without
    // waiting on (or requiring) UDP-broadcast discovery. Real discovery still
    // runs and will register anything else it finds.
    for (const device of appConfig.static_devices ?? []) {
      store.dispatch(
        registerDevice({
          ...device,
          available: device.available ?? true,
          activity: undefined,
          normalizedName:
            device.normalizedName ??
            device.name
              .replace(/[^a-zA-Z\d\s-_:]/g, "")
              .replace(/[\s-]/g, "_")
              .toLowerCase(),
        }),
      )
    }

    const cmdTopicRegEx = /^ps5-mqtt\/([^/]*)\/set\/(.*)$/

    mqtt.on("message", async (topic, payload) => {
      debugMqtt("MQTT Message received", topic)

      if (cmdTopicRegEx.test(topic)) {
        const matches = cmdTopicRegEx.exec(topic)
        if (!matches) {
          return
        }
        const [, deviceId, deviceProperty] = matches
        const devices = getDeviceRegistry(store.getState())
        const device = devices[deviceId]
        if (device !== undefined && deviceProperty === "power") {
          const data = payload.toString()
          store.dispatch(setPowerMode(device, data as SwitchStatus))
        }
      }
    })

    await mqtt.subscribe("ps5-mqtt/#")

    // don't poll if there are no accounts registered
    if (accountCount > 0) {
      store.dispatch(pollPsnPresence())
    }

    store.dispatch(pollDiscovery())
    store.dispatch(pollDevices())
  } catch (e) {
    logError(e)
  }

  setupWebserver(appConfig.frontendPort ?? 3000, settings)
}
