import { merge } from "lodash";
import type { AnyAction, State } from "./types";

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
            const newState = merge({}, state);
            newState.devices[action.payload.id] = action.payload;
            return newState;
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
