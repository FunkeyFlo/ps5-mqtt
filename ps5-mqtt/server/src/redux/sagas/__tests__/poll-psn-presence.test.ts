import { testSaga } from "redux-saga-test-plan"
import { delay, getContext, put, select } from "redux-saga/effects"

import { Settings, SETTINGS } from "../../../services"
import { checkPsnPresence } from "../../action-creators"
import { getDeviceList } from "../../selectors"
import type { Device } from "../../types"
import { pollPsnPresence } from "../poll-psn-presence"

const settings = {
  checkAccountInterval: 5000,
  checkAccountIdleInterval: 60000,
} as Settings

const device = (status: Device["status"]) => ({ status }) as Device

describe("Poll PSN presence saga", () => {
  test("keeps checking accounts, on the idle interval, when no console is awake", () => {
    testSaga(pollPsnPresence)
      .next()
      .is(getContext(SETTINGS))
      .next(settings)
      .is(select(getDeviceList))
      .next([device("STANDBY"), device("UNKNOWN")])
      .is(put(checkPsnPresence()))
      .next()
      .is(delay(60000))
  })

  test("keeps checking accounts when there are no consoles at all", () => {
    testSaga(pollPsnPresence)
      .next()
      .next(settings)
      .next([])
      .is(put(checkPsnPresence()))
      .next()
      .is(delay(60000))
  })

  test("checks accounts on the fast interval while a console is awake", () => {
    testSaga(pollPsnPresence)
      .next()
      .next(settings)
      .next([device("STANDBY"), device("AWAKE")])
      .is(put(checkPsnPresence()))
      .next()
      .is(delay(5000))
  })

  test("goes back to the idle interval when the console goes to sleep", () => {
    testSaga(pollPsnPresence)
      .next()
      .next(settings)
      .next([device("AWAKE")])
      .next()
      .is(delay(5000))
      .next()
      .is(select(getDeviceList))
      .next([device("STANDBY")])
      .next()
      .is(delay(60000))
  })
})
