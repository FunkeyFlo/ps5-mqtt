import { Discovery } from "playactor/dist/discovery";
import { DeviceType } from "playactor/dist/discovery/model";
import { call, put, select } from "redux-saga/effects";
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
    const discovery = new Discovery({ deviceType: DeviceType.PS5 });
    const discoveredDevices: Device[] = yield call(
        useAsyncIterableWithSaga(
            discovery.discover.bind(discovery),
            {},
            {
                timeoutMillis: 3000,
            }
        )
    );

    const trackedDevices = yield select(getDeviceRegistry);
    for (const ps5 of discoveredDevices) {
        if (trackedDevices[ps5.id] === undefined) {
            yield put(
                registerDevice(
                    {
                        ...ps5, 
                        normalizedName: 
                            ps5.name.replace(/[^a-zA-Z\d\s-_:]/g, '')
                                    .replace(/[\s-]/g, '_')
                                    .toLowerCase()
                    }
                )
            );
        }
    }
}

export { discoverDevices };

