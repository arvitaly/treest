import deepEqual = require("deep-equal");
import { writeFileSync } from "fs";
import mkdirp = require("mkdirp");
import ModuleM = require("module");
import { dirname, join, resolve, sep } from "path";
import withError from "with-error";
import { isPlainObject } from "./util";
const Module: any = ModuleM;
export interface ITestCall {
    id: string | undefined;
    moduleName: string;
    exportPath: string;
    args: any[];
    result: any;
    isPromise: boolean | undefined;
}
export interface IRegistryConfig {
    callsPath: string;
    command: string;
    rootPath: string;
    logger: typeof console;
    mocks: { [index: string]: any };
    ignoreMockModules: string[];
    knownClasses: Array<{
        class: any;
        name: string;
        toJSON?: (value: any) => any;
    }>;
    realRequire?: typeof require;
}
class Registry {
    public realLoad: any;
    public hasUnexpected = false;
    protected modules: {
        [index: string]: {
            mock: any;
            real: any;
        };
    } = {};
    protected funcs: Array<{
        moduleName: string;
        exportPath: string;
        func: (...args: any[]) => any;
        realFunc: (...args: any[]) => any;
    }> = [];
    protected classes: Array<{
        moduleName: string;
        exportPath: string;
        class: any;
    }>;
    protected objects: Array<{
        moduleName: string;
        exportPath: string;
        real: any;
        mock: any;
    }> = [];
    protected calls: ITestCall[] = [];
    protected expectedCalls: ITestCall[] = [];
    protected ignoreMock = false;
    protected tempArgsObjects: Array<{ mock: any; real: any; }>;
    protected realDate: typeof Date;
    protected realRandom: typeof Math.random;
    constructor(protected config: IRegistryConfig) {
        require.cache = {}; this.realDate = Date;
        this.realRandom = Math.random;
        this.realLoad = this.config.realRequire ? this.config.realRequire : Module._load;
        // this.expectedCalls = this.config.calls;
    }
    public addKnownClass = (params: { class: any; name: string; }) => {
        this.config.knownClasses.push(params);
    }
    public unmockRequire() {
        Module._load = this.realLoad;
    }
    public mockRequire() {
        Module._load = (request: string, parent: any) => {
            const modulePath = Module._resolveFilename(request, parent);
            if (this.modules[modulePath]) {
                return this.modules[modulePath].mock;
            }
            const returns = this.requireModule(request, parent);
            return returns;
        };
    }
    public requireModule(request: string, parent: any) {
        if (this.ignoreMock) {
            return this.realLoad(request, parent);
        }
        const isNodeModule = !request.startsWith(".") && request.indexOf(":") === -1
            || request.indexOf("node_modules") > -1 || (
                parent && parent.id.indexOf("node_modules") > -1);
        const modulePath = !isNodeModule ? Module._resolveFilename(request, parent) : request;
        if (this.config.ignoreMockModules.indexOf(modulePath) > -1) {
            return this.realLoad(request, parent);
        }
        if ((!isNodeModule && !modulePath.endsWith(".js")) || (isNodeModule && !this.config.mocks[request])) {
            // Module._load = this.realLoad;
            this.ignoreMock = true;
            const exports2 = this.realLoad(request, parent);
            // this.mockRequire();
            this.ignoreMock = false;
            return exports2;
        }
        const moduleName = isNodeModule ? request :
            modulePath.replace(resolve(this.config.rootPath) + sep, "").replace(/\\/gi, "\/")
                .replace(/\.js$/, "");
        if (this.modules[moduleName]) {
            return this.modules[moduleName].mock;
        }
        this.loadCalls(moduleName);
        const exports = !this.config.mocks[request] ?
            this.realLoad(modulePath, parent) : this.config.mocks[request]();
        this.modules[moduleName] = { mock: this.mockAny(moduleName, "", exports), real: exports };
        return this.modules[moduleName].mock;
    }
    public loadCalls(moduleName: string) {
        const { error, result } = withError(() => this.realLoad(join(this.config.callsPath, moduleName)));
        if (!error) {
            const calls: { [index: string]: any[] } = result;
            Object.keys(calls).map((exportPath) => {
                calls[exportPath].map((call) => {
                    this.expectedCalls.push({
                        moduleName,
                        exportPath,
                        args: call.args,
                        isPromise: call.isPromise,
                        result: call.result,
                        id: undefined,
                    });
                });
            });
        }
    }
    public mockAny(moduleName: string, exportPath: string, value: any): any {
        if (value === null) {
            return null;
        }
        switch (typeof (value)) {
            case "string":
            case "boolean":
            case "number":
            case "symbol":
            case "undefined":
                return value;
            case "function":
                const existingFunc = this.funcs.find((f) => f.func === value);
                if (existingFunc) {
                    return existingFunc.func;
                }
                return this.createMockFunction(moduleName, exportPath, value);
            case "object":
                if (Array.isArray(value)) {
                    return value.map((v, i) => this.mockAny(moduleName, exportPath + "." + i, v));
                }
                if (isPlainObject) {
                    const obj = this.objects.find((o) => o.real === value);
                    if (obj) {
                        return obj.mock;
                    }
                    const newObj = { moduleName, exportPath, real: value, mock: undefined };
                    this.objects.push(newObj);
                    const returns: any = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.mockAny(moduleName, exportPath + "." + objectKey, value[objectKey]);
                    }
                    newObj.mock = returns;
                    return returns;
                }
        }
    }
    public createMockFunction(moduleName: string, exportPath: string, func: any) {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        const mockFunc = function mock(this: any, ...args: any[]) {
            let isClass = false;
            if (this instanceof mock) {
                isClass = true;
            }
            if (isClass) {
                // func.prototype.constructor.apply(this, args);
                const obj = new func(...args);
                const methodsNames = [...Object.getOwnPropertyNames(Object.getPrototypeOf(obj)), ...Object.keys(obj)];
                for (const fieldName of methodsNames) {
                    if (typeof (obj[fieldName]) === "function" && fieldName !== "toJSON"
                        && fieldName !== "constructor") {
                        const realMethod = obj[fieldName];
                        obj[fieldName] =
                            that.callMockMethod.bind(that, moduleName, exportPath, fieldName, obj[fieldName], obj);
                        that.funcs.push({
                            moduleName,
                            exportPath: exportPath + "." + fieldName,
                            func: obj[fieldName],
                            realFunc: realMethod,
                        });
                    }
                }
                // obj.___$___methodsCalls = [];
                return obj;
            }
            const id = (+new (that.realDate)()).toString() + Math.floor(that.realRandom() * 1000000).toString();
            that.beforeCall(id, moduleName, exportPath, that.parseArgs(moduleName, exportPath, args));
            const result = func(...args);
            if (result && typeof result.then === "function") {
                result
                    .then((res: any) => that.afterCall(id, res, true))
                    .catch((e: any) => {
                        // that.afterCall(id, { __$__: "Error", value: e.toString() }, true);
                        throw e;
                    });
            } else {
                that.afterCall(id, result, false);
            }
            return result;
        };
        if (func.prototype) {
            mockFunc.prototype = func.prototype;
            func.prototype.___$___methodsCalls = [];
        }
        this.funcs.push({
            moduleName,
            exportPath,
            func: mockFunc,
            realFunc: func,
        });
        return mockFunc;
    }
    public callMockMethod(
        moduleName: string, exportPath: string, methodName: string, method: any, obj: any, ...args: any[]) {
        const id = (+new (this.realDate)()).toString() + Math.floor(this.realRandom() * 1000000).toString();
        this.beforeCall(id, moduleName, exportPath + "." + methodName,
            this.parseArgs(moduleName, exportPath, [obj, ...args]));
        obj.___$___methodsCalls.push({ methodName, args: this.parseArgs(moduleName, exportPath, args) });
        const result = method.apply(obj, args);
        if (result && typeof result.then === "function") {
            result
                .then((res: any) => this.afterCall(id, res, true))
                .catch((e: any) => {
                    throw e;
                    // this.afterCall(id, { __$__: "Error", value: e.toString() }, true)
                });
        } else {
            this.afterCall(id, result, false);
        }
        return result;
    }
    public parseArgs(moduleName: string, exportPath: string, args: any[]) {
        this.tempArgsObjects = [];
        const returns = args.map((arg) => this.parseAnyArgs(moduleName, exportPath, arg));
        this.tempArgsObjects = [];
        return returns;
    }
    public parseAnyArgs(moduleName: string, exportPath: string, value: any): any {
        if (value === null) {
            return null;
        }
        switch (typeof (value)) {
            case "string":
            case "boolean":
            case "number":
            case "symbol":
            case "undefined":
                return value;
            case "function":
                const func = this.funcs.find((f) => f.func === value);
                if (!func) {
                    throw new Error("Unknown function in " + moduleName + "::" + exportPath + "::" + value);
                }
                return { __$__: "function", moduleName: func.moduleName, exportPath: func.exportPath };
            case "object":
                if (Array.isArray(value)) {
                    return value.map((v) => this.parseAnyArgs(moduleName, exportPath, v));
                }
                if (isPlainObject(value)) {

                    const existingObj = this.tempArgsObjects.find((o) => o.real === value);
                    if (existingObj) {
                        return existingObj.mock;
                    }
                    const newObj = { real: value, mock: undefined };
                    this.tempArgsObjects.push(newObj);
                    const returns: any = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.parseAnyArgs(moduleName,
                            exportPath + "." + objectKey, value[objectKey]);
                    }
                    newObj.mock = returns;
                    return returns;
                }
                if (value instanceof Error) {
                    return {
                        __$__: "Error",
                        value: value.toString(),
                    };
                }
                const knownClass = this.config.knownClasses.find((cl) => value instanceof cl.class);
                if (knownClass) {
                    return {
                        __$__: "class",
                        name: knownClass.name,
                        state: knownClass.toJSON ? knownClass.toJSON(value) : JSON.stringify(value),
                    };
                }
                const clas = this.funcs.find((cl) => cl.realFunc.prototype && value instanceof cl.realFunc);
                if (clas) {
                    return {
                        __$__: "class",
                        moduleName: clas.moduleName,
                        exportPath: clas.exportPath,
                        state: JSON.stringify(value),
                    };
                }
                throw new Error("Unknown object " + value.constructor.name + " in " + moduleName + "::" + exportPath);
        }
    }
    public hasModule(moduleName: string) {
        return !!this.modules[moduleName];
    }
    public getModule(moduleName: string) {
        return this.modules[moduleName];
    }
    public beforeCall(id: string, moduleName: string, exportPath: string, args: any[]) {
        this.calls.push({
            moduleName,
            exportPath,
            args,
            id,
            result: undefined,
            isPromise: undefined,
        });
        // console.log("beforeCall", id, moduleName, exportPath, args);
    }
    public afterCall(id: string, result: any, isPromise: boolean) {
        const call = this.calls.filter((c) => c.id === id)[0];
        result = this.parseAnyArgs(call.moduleName, call.exportPath, result);
        const expectedCall = this.expectedCalls.find((c) => deepEqual(c.args, call.args)
            && c.moduleName === call.moduleName && c.exportPath === call.exportPath);
        if (expectedCall) {
            if (!deepEqual(
                JSON.parse(JSON.stringify(expectedCall.result)),
                JSON.parse(JSON.stringify(result))) || isPromise !== expectedCall.isPromise) {
                if (this.config.command === "update") {
                    this.config.logger.log(
                        "Update result: \n" +
                        "\x1b[35m" + call.moduleName + "::" + call.exportPath + "\x1b[0m\n" +
                        "Args: \x1b[33m" + JSON.stringify(call.args, null, 2) + "\x1b[0m\n" +
                        "Result: \x1b[37m" + JSON.stringify(result, null, 2) + "\x1b[0m\n" +
                        "Expected: \x1b[32m" + JSON.stringify(expectedCall.result, null, 2) + "\x1b[0m");
                } else {
                    throw new UnexpectedResultError({
                        args: call.args,
                        moduleName: call.moduleName,
                        exportPath: call.exportPath,
                        result,
                        expectedResult: expectedCall.result,
                        isPromise,
                    });
                }
            }
        }
        call.result = result;
        call.isPromise = isPromise;
        if (this.config.mocks[call.moduleName]) {
            return;
        }
        const calls: any = {};
        this.calls.filter((c) => c.moduleName === call.moduleName)
            .map((c) => {
                if (!calls[c.exportPath]) {
                    calls[c.exportPath] = [];
                }
                calls[c.exportPath].push({
                    args: c.args,
                    result: c.result,
                    isPromise: c.isPromise,
                });
            });
        const moduleSavePath = join(this.config.callsPath, call.moduleName + ".json");
        withError(() => mkdirp.sync(dirname(moduleSavePath)));
        writeFileSync(moduleSavePath, JSON.stringify(calls, null, 2));
    }
    public getCalls() {
        return this.calls;
    }
}
// tslint:disable-next-line:max-classes-per-file
export class UnexpectedResultError extends Error {
    constructor(protected config: {
        moduleName: string;
        exportPath: string;
        args: any;
        result: any;
        expectedResult: any;
        isPromise: boolean;
    }) {
        super();
    }
    public getInfo() {
        return this.config;
    }
    public toString() {
        return "\x1b[35m" + this.config.moduleName + "::" + this.config.exportPath + "\x1b[0m\n" +
            "Args: \x1b[33m" + JSON.stringify(this.config.args, null, 2) + "\x1b[0m\n" +
            "Result: \x1b[31m" + JSON.stringify(this.config.result, null, 2) + "\x1b[0m\n" +
            "Expected: \x1b[32m" + JSON.stringify(this.config.expectedResult, null, 2) + "\x1b[0m";
    }
}
export default Registry;
