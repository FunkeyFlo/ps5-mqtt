import { Discovery } from "playactor/dist/discovery";
import { DeviceType } from "playactor/dist/discovery/model";
import { call, getContext, put, select } from "redux-saga/effects";
import { SETTINGS, Settings } from "../../services";
import { registerDevice } from "../action-creators";
import { getDeviceRegistry } from "../selectors";
import { Device } from "../types";

const useAsyncIterableWithSaga =
    (fn: (...args: unknown[]) => AsyncIterable<unknown>, ...args) =>
        () =>
            // eslint-disable-next-line no-async-promise-executor
            new Promise(async (resolve, reject) => {
                const iterable = fn(...args);
                const outputs: unknown[] = [];
                try {
                    for await (const iterableAction of await iterable) {
                        if (iterableAction) {
                            outputs.push(iterableAction);
                        }
                    }
                    resolve(outputs);
                } catch (error) {
                    reject(error);
                }
            });

function* discoverDevices() {
    const {
        allowPs4Devices,
        deviceDiscoveryBroadcastAddress
    }: Settings = yield getContext(SETTINGS);

    const discovery = new Discovery({
        deviceIp: deviceDiscoveryBroadcastAddress
    });
    let discoveredDevices: Device[] = yield call(
        useAsyncIterableWithSaga(
            discovery.discover.bind(discovery),
            {},
            {
                timeoutMillis: 3000,
            }
        )
    );

    if (!allowPs4Devices) {
        discoveredDevices = discoveredDevices.filter(d => d.type === DeviceType.PS5);
    }

    const trackedDevices = yield select(getDeviceRegistry);
    for (const device of discoveredDevices) {
        if (trackedDevices[device.id] === undefined) {
            yield put(
                registerDevice({
                    ...device,
                    available: true,
                    normalizedName:
                        device.name.replace(/[^a-zA-Z\d\s-_:]/g, '')
                            .replace(/[\s-]/g, '_')
                            .toLowerCase(),
                    activity: undefined,
                })
            );
        }
    }
}

export { discoverDevices };

