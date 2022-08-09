import { merge } from "lodash";
import type { AnyAction, Device, State } from "./types";

const defaultState: State = {
    devices: {},
    accounts: {}
};

const reducer = (state = defaultState, action: AnyAction) => {
    switch (action.type) {
        case "ADD_DEVICE": {
            return merge({}, state, {
                devices: {
                    [action.payload.id]: action.payload,
                },
            });
        }

        case "UPDATE_HOME_ASSISTANT": {
            return merge({}, state, {
                devices: {
                    [action.payload.id]: <Partial<Device>>{
                        status: action.payload.status,
                        available: action.payload.available,
                    },
                },
            });
        }

        case "TRANSITIONING": {
            return merge({}, state, {
                devices: {
                    [action.payload.id]: {
                        transitioning: action.payload.transitioning,
                    },
                },
            });
        }

        case "UPDATE_PSN_ACCOUNT": {
            return merge({}, state, {
                accounts: {
                    [action.payload.accountId]: action.payload,
                },
            });
        }
    }

    return state;
};

export default reducer;
