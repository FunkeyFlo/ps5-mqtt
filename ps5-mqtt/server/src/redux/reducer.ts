import _ from "lodash"
import type { AnyAction, State } from "./types"

const defaultState: State = {
  devices: {},
  accounts: {},
}

const reducer = (state = defaultState, action: AnyAction) => {
  switch (action.type) {
    case "ADD_DEVICE": {
      return _.merge({}, state, {
        devices: {
          [action.payload.id]: action.payload,
        },
      })
    }

    case "UPDATE_DEVICE": {
      const device = state.devices[action.payload.id]
      if (device === undefined) {
        return state
      }
      return {
        ...state,
        devices: {
          ...state.devices,
          [action.payload.id]: { ...device, ...action.payload },
        },
      }
    }

    case "UPDATE_HOME_ASSISTANT": {
      const newState = _.merge({}, state)
      newState.devices[action.payload.id] = action.payload
      return newState
    }

    case "TRANSITIONING": {
      return _.merge({}, state, {
        devices: {
          [action.payload.id]: {
            transitioning: action.payload.transitioning,
            checkFailures: 0,
          },
        },
      })
    }

    case "UPDATE_PSN_ACCOUNT": {
      return _.merge({}, state, {
        accounts: {
          [action.payload.accountId]: action.payload,
        },
      })
    }

    case "PSN_PRESENCE_UNAVAILABLE": {
      const account = state.accounts[action.payload.accountId]
      if (account === undefined) {
        return state
      }
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [account.accountId]: { ...account, presenceAvailable: false },
        },
      }
    }
  }

  return state
}

export default reducer
