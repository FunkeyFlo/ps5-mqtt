import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import type { PutEffect } from "redux-saga/effects"

import { PsnAccount } from "../../../psn-account"
import { updateHomeAssistant } from "../../action-creators"
import { Account, Device, State, UpdateAccountAction } from "../../types"
import { updateAccount } from "../update-account"

describe("Check PSN Presence saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("can match account activity to a single device", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount({ activity })
    const mockDevice = makeDevice()

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(mockDevice))
      .run()

    expect(putActions(effects.put)).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: { ...activity, activePlayers: [mockAccount.accountName] },
        }),
      ),
    )
  })

  test("will, by default, match account activity only to the first available device of the same type", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount({ activity })
    const ps5Device1 = makeDevice()
    const ps5Device2 = makeDevice(SECOND_DEVICE)

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(ps5Device1, ps5Device2))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: { ...activity, activePlayers: [mockAccount.accountName] },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will match account activity to a preferred device when specified", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount({
      activity,
      preferredDevices: { ps5: "mock-id-2" },
    })
    const ps5Device1 = makeDevice()
    const ps5Device2 = makeDevice(SECOND_DEVICE)

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(ps5Device1, ps5Device2))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          ...SECOND_DEVICE,
          activity: { ...activity, activePlayers: [mockAccount.accountName] },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will match account activity to the first available device when a preferred device is not 'Awake'", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount({
      activity,
      preferredDevices: { ps5: "mock-id-2" },
    })
    const ps5Device1 = makeDevice()
    const ps5Device2 = makeDevice({ ...SECOND_DEVICE, status: "STANDBY" })

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(ps5Device1, ps5Device2))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: { ...activity, activePlayers: [mockAccount.accountName] },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will match account activity only to a device that's 'Awake'", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount({ activity })
    const ps5Device1 = makeDevice({ status: "STANDBY" })
    const ps5Device2 = makeDevice(SECOND_DEVICE)

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(ps5Device1, ps5Device2))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          ...SECOND_DEVICE,
          activity: { ...activity, activePlayers: [mockAccount.accountName] },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will add player to existing activity when another player is already active on the console", async () => {
    const activity = makeActivity()
    const mockAccount1 = makeAccount({ activity })
    const mockAccount2 = makeAccount({
      accountId: "mock-account-id-2",
      accountName: "TestUser2",
      activity,
    })
    const mockDevice = makeDevice({
      activity: { ...activity, activePlayers: [mockAccount1.accountName] },
    })

    const { effects } = await expectSaga(updateAccount, action(mockAccount2))
      .withState(stateWith(mockDevice))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: {
            ...activity,
            activePlayers: [mockAccount1.accountName, mockAccount2.accountName],
          },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will match each player to their preferred device", async () => {
    const activity1 = makeActivity()
    const activity2 = makeActivity({
      titleId: "Game 2",
      titleImage: "http://somegameurl.net/path-to-game2-image",
      titleName: "GAME2ID",
    })
    const mockAccount1 = makeAccount({
      activity: activity1,
      preferredDevices: { ps5: "mock-id-1" },
    })
    const mockAccount2 = makeAccount({
      accountId: "mock-account-id-2",
      accountName: "TestUser2",
      activity: activity2,
      preferredDevices: { ps5: "mock-id-2" },
    })
    const mockDevice1 = makeDevice()
    const mockDevice2 = makeDevice(SECOND_DEVICE)

    // Both invocations share the same device objects (as the original test did)
    // so the second run observes mutations made by the first.
    const state = stateWith(mockDevice1, mockDevice2)

    const firstRun = await expectSaga(updateAccount, action(mockAccount1))
      .withState(state)
      .run()

    expect(putActions(firstRun.effects.put)).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: { ...activity1, activePlayers: [mockAccount1.accountName] },
        }),
      ),
    )

    const secondRun = await expectSaga(updateAccount, action(mockAccount2))
      .withState(state)
      .run()

    expect(putActions(secondRun.effects.put)).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          ...SECOND_DEVICE,
          activity: { ...activity2, activePlayers: [mockAccount2.accountName] },
        }),
      ),
    )

    expect(putActions(firstRun.effects.put)).toHaveLength(1)
    expect(putActions(secondRun.effects.put)).toHaveLength(1)
  })

  test("will remove player from existing activity when another player is still active on the console", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount()
    const mockDevice = makeDevice({
      activity: {
        ...activity,
        activePlayers: [mockAccount.accountName, "other_user"],
      },
    })

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(mockDevice))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(
        makeDevice({
          activity: { ...activity, activePlayers: ["other_user"] },
        }),
      ),
    )
    expect(dispatched).toHaveLength(1)
  })

  test("will remove activity from device when no players are active on the console", async () => {
    const activity = makeActivity()
    const mockAccount = makeAccount()
    const mockDevice = makeDevice({
      activity: { ...activity, activePlayers: [mockAccount.accountName] },
    })

    const { effects } = await expectSaga(updateAccount, action(mockAccount))
      .withState(stateWith(mockDevice))
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched).toContainEqual(
      updateHomeAssistant(makeDevice({ activity: undefined })),
    )
    expect(dispatched).toHaveLength(1)
  })
})

// --- helpers ---

type DispatchedAction = { type: string; payload?: unknown }

// Deep-partial so overrides can reach into nested objects (e.g. just
// `address.address`) and let lodash.merge fill in the rest of the defaults.
type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T

const DEFAULT_ACTIVITY: PsnAccount.AccountActivity = {
  launchPlatform: "PS5",
  platform: "PS5",
  titleId: "Game 1",
  titleImage: "http://somegameurl.net/path-to-game1-image",
  titleName: "GAME1ID",
}

const DEFAULT_DEVICE: Device = {
  address: { address: "192.168.0.10", port: 80 },
  available: true,
  id: "mock-id-1",
  name: "mock-ps5-1",
  normalizedName: "mock_ps5_1",
  status: "AWAKE",
  systemVersion: "",
  transitioning: false,
  type: "PS5",
  activity: undefined,
}

// Identity overrides for the second console used in multi-device tests.
const SECOND_DEVICE: DeepPartial<Device> = {
  id: "mock-id-2",
  name: "mock-ps5-2",
  normalizedName: "mock_ps5_2",
  address: { address: "192.168.0.11" },
}

const DEFAULT_ACCOUNT: Account = {
  accountId: "mock-account-id-1",
  accountName: "TestUser1",
  authInfo: {
    accessToken: "",
    accessTokenExpiration: 0,
    refreshToken: "",
    refreshTokenExpiration: 0,
  },
  npsso: "----",
  activity: undefined,
  preferredDevices: {},
}

function makeActivity(
  overrides: DeepPartial<PsnAccount.AccountActivity> = {},
): PsnAccount.AccountActivity {
  return lodash.merge({}, DEFAULT_ACTIVITY, overrides)
}

function makeDevice(overrides: DeepPartial<Device> = {}): Device {
  return lodash.merge({}, DEFAULT_DEVICE, overrides)
}

function makeAccount(overrides: DeepPartial<Account> = {}): Account {
  return lodash.merge({}, DEFAULT_ACCOUNT, overrides)
}

function putActions(puts: PutEffect[] | undefined): DispatchedAction[] {
  return (puts ?? []).map((effect) => effect.payload.action as DispatchedAction)
}

function stateWith(...devices: Device[]): State {
  return <State>{
    devices: Object.fromEntries(devices.map((d) => [d.id, d])),
    accounts: {},
  }
}

function action(account: Account): UpdateAccountAction {
  return {
    type: "UPDATE_PSN_ACCOUNT",
    payload: account,
  }
}
