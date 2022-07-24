import createDebugger, { Debugger } from 'debug';

let errorLogger: Debugger = undefined;

const createErrorLogger = (): Debugger => {
    if (errorLogger === undefined) {
        errorLogger = createDebugger("@ha:ps5:error")
    }

    return errorLogger;
};

export { createErrorLogger };
