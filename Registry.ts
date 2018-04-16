import deepEqual = require("deep-equal");
import ModuleM = require("module");
import { resolve, sep } from "path";
import { isPlainObject } from "./util";
const Module: any = ModuleM;
export interface ITestCall {
    id: string;
    moduleName: string;
    exportPath: string;
    args: any[];
    result: any;
    isPromise: boolean | undefined;
}
export interface IRegistryConfig {
    calls: ITestCall[];
    command: string;
    rootPath: string;
    logger: typeof console;
}
class Registry {
    public realLoad: any;
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
    protected calls: ITestCall[] = [];
    protected expectedCalls: ITestCall[] = [];
    constructor(protected config: IRegistryConfig) {
        this.expectedCalls = this.config.calls;
        this.realLoad = Module._load;
        Module._load = (request: string, parent: any) => {
            const modulePath = Module._resolveFilename(request, parent);
            if (this.modules[modulePath]) {
                return this.modules[modulePath].mock;
            }
            return this.requireModule(request, parent);
        };
    }
    public requireModule(request: string, parent: string) {
        const modulePath = Module._resolveFilename(request, parent);
        if (!modulePath.endsWith(".js")) {
            return this.realLoad(request, parent);
        }
        const moduleName = modulePath.replace(resolve(this.config.rootPath) + sep, "").replace(/\\/gi, "\/")
            .replace(/\.js$/, "");
        const exports = this.realLoad(modulePath, parent);
        this.modules[moduleName] = { mock: this.mockAny(moduleName, "", exports), real: exports };
        return this.modules[moduleName].mock;
    }
    public mockAny(moduleName: string, exportPath: string, value: any): any {
        switch (typeof (value)) {
            case "string":
            case "boolean":
            case "number":
            case "symbol":
            case "undefined":
                return value;
            case "function":
                return this.createMockFunction(moduleName, exportPath, value);
            case "object":
                if (Array.isArray(value)) {
                    return value.map((v, i) => this.mockAny(moduleName, exportPath + "." + i, v));
                }
                if (isPlainObject) {
                    const returns: any = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.mockAny(moduleName, exportPath + "." + objectKey, value[objectKey]);
                    }
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
                for (const fieldName of Object.getOwnPropertyNames(Object.getPrototypeOf(obj))) {
                    if (typeof (obj[fieldName]) === "function") {
                        obj[fieldName] =
                            that.callMockMethod.bind(that, moduleName, exportPath, fieldName, obj[fieldName], obj);
                    }
                }
                // obj.___$___methodsCalls = [];
                return obj;
            }
            const id = (+new Date()).toString() + Math.floor(Math.random() * 1000000).toString();
            that.beforeCall(id, moduleName, exportPath, that.parseArgs(moduleName, exportPath, args));
            const result = func(...args);
            if (result instanceof Promise) {
                result.then((res) => that.afterCall(id, res, true));
            } else {
                that.afterCall(id, result, false);
            }
            return result;
        };
        if (func.prototype) {
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
        const id = (+new Date()).toString() + Math.floor(Math.random() * 1000000).toString();
        this.beforeCall(id, moduleName, exportPath + "." + methodName,
            this.parseArgs(moduleName, exportPath, [obj, ...args]));
        obj.___$___methodsCalls.push({ methodName, args: this.parseArgs(moduleName, exportPath, args) });
        const result = method(...args);
        if (result instanceof Promise) {
            result.then((res) => this.afterCall(id, res, true));
        } else {
            this.afterCall(id, result, false);
        }
        return result;
    }
    public parseArgs(moduleName: string, exportPath: string, args: any[]) {
        return args.map((arg) => this.parseAnyArgs(moduleName, exportPath, arg));
    }
    public parseAnyArgs(moduleName: string, exportPath: string, value: any): any {
        switch (typeof (value)) {
            case "string":
            case "boolean":
            case "number":
            case "symbol":
            case "undefined":
                return value;
            case "function":
                if (!this.funcs.find((f) => f.func === value)) {
                    throw new Error("Unknown function " + value);
                }
                return { __$__: "function", moduleName, exportPath };
            case "object":
                if (Array.isArray(value)) {
                    return value.map((v) => this.parseAnyArgs(moduleName, exportPath, v));
                }
                if (isPlainObject(value)) {
                    const returns: any = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.parseAnyArgs(moduleName,
                            exportPath + "." + objectKey, value[objectKey]);
                    }
                    return returns;
                }
                const clas = this.funcs.find((cl) => value instanceof cl.realFunc);
                if (clas) {
                    return {
                        __$__: "class",
                        moduleName: clas.moduleName,
                        exportPath: clas.exportPath,
                        state: JSON.stringify(value),
                    };
                }
                throw new Error("Unknown object " + value.constructor.name);
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
        const logger = this.config.logger;
        const call = this.calls.filter((c) => c.id === id)[0];
        logger.log("");
        logger.log("Test ::", "\x1b[35m" + call.moduleName + "\x1b[0m");
        logger.log("\x1b[33m%s\x1b[0m", call.exportPath, call.args, "->", "\x1b[32m" + result + "\x1b[0m");

        const expectedCall = this.expectedCalls.find((c) => deepEqual(c.args, call.args)
            && c.moduleName === call.moduleName && c.exportPath === call.exportPath);
        if (expectedCall) {
            if (!deepEqual(expectedCall.result, result) || isPromise !== expectedCall.isPromise) {
                if (this.config.command === "update") {
                    logger.log("\x1b[36m%s%s%s\x1b[0m",
                        "Test's result was updated", " expected ", expectedCall.result, " real ", result);
                    expectedCall.result = result;
                } else {
                    logger.log("\x1b[41m%s%s%s\x1b[0m",
                        "Unexpected result", " expected ", expectedCall.result, " real ", result);
                    process.exit(1);
                }
            }
        }
        call.result = result;
        call.isPromise = isPromise;
        // console.log(id, moduleName, exportPath, result);
    }
    public getCalls() {
        return this.calls;
    }
}
export default Registry;
