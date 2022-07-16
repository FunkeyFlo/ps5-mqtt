// import createDebug from 'debug';
// import fs from 'fs';
// import { pick } from 'lodash';
// import path from 'path';
// import { Playstation5 } from '../device';
// import { createErrorLogger } from './error-logger';

// const DEVICE_DB_FILE = 'ps5-db.json';

// const debug = createDebug('@ha:ps5:persistency')
// const debugError = createErrorLogger();

// let persistor: DevicePersistor | undefined = undefined;

// export function createDevicePersistor(storagePath?: string) {
//     if (persistor === undefined) {
//         persistor = new DevicePersistor(storagePath);
//     }

//     return persistor;
// }

// class DevicePersistor {
//     constructor(private readonly storagePath: string) { }

//     public read(): Record<string, Playstation5> | undefined {
//         debug('Reading Device Database');
//         try {
//             const dbPath = this.getDeviceDbPath();
//             if (fs.existsSync(dbPath)) {
//                 const dbJson = fs.readFileSync(dbPath, { encoding: 'utf-8' });
//                 const db = JSON.parse(dbJson);
//                 debug('Devices retrieved from Database', db);
//                 return db;
//             }

//             debug('no existing device database');
//             return undefined;
//         }
//         catch (e) {
//             debugError(e);
//             return undefined;
//         }
//     }

//     public write(value: Record<string, Playstation5>): void {
//         debug('Writing Device Database');
//         try {
//             const dbPath = this.getDeviceDbPath();
//             const sanitizedValue: Record<string, Playstation5> = {};

//             for (const id in value) {
//                 const ps5 = value[id];
//                 sanitizedValue[id] = pick(ps5, [
//                     'id',
//                     'name',
//                     'transitioning',
//                     'address',
//                     'systemVersion'
//                 ]);
//             }

//             fs.writeFileSync(dbPath, JSON.stringify(sanitizedValue))

//             debug('Device database created');
//         }
//         catch (e) {
//             debugError(e);
//         }
//     }

//     private getDeviceDbPath(): string {
//         return path.join(this.storagePath, DEVICE_DB_FILE);
//     }
// }

// export type { DevicePersistor };
// export default createDevicePersistor;