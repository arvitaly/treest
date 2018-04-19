"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepEqual = require("deep-equal");
const ModuleM = require("module");
const path_1 = require("path");
const util_1 = require("./util");
const Module = ModuleM;
class Registry {
    constructor(config) {
        this.config = config;
        this.hasUnexpected = false;
        this.modules = {};
        this.funcs = [];
        this.calls = [];
        this.expectedCalls = [];
        this.expectedCalls = this.config.calls;
        this.realLoad = Module._load;
        Module._load = (request, parent) => {
            const modulePath = Module._resolveFilename(request, parent);
            if (this.modules[modulePath]) {
                return this.modules[modulePath].mock;
            }
            return this.requireModule(request, parent);
        };
    }
    requireModule(request, parent) {
        const isNodeModule = !request.startsWith(".");
        const modulePath = !isNodeModule ? Module._resolveFilename(request, parent) : request;
        if (!isNodeModule && !modulePath.endsWith(".js")) {
            return this.realLoad(request, parent);
        }
        const moduleName = isNodeModule ? request :
            modulePath.replace(path_1.resolve(this.config.rootPath) + path_1.sep, "").replace(/\\/gi, "\/")
                .replace(/\.js$/, "");
        if (this.modules[moduleName]) {
            return this.modules[moduleName].mock;
        }
        const exports = !this.config.mocks[request] ?
            this.realLoad(modulePath, parent) : this.config.mocks[request]();
        this.modules[moduleName] = { mock: this.mockAny(moduleName, "", exports), real: exports };
        return this.modules[moduleName].mock;
    }
    mockAny(moduleName, exportPath, value) {
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
                if (util_1.isPlainObject) {
                    const returns = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.mockAny(moduleName, exportPath + "." + objectKey, value[objectKey]);
                    }
                    return returns;
                }
        }
    }
    createMockFunction(moduleName, exportPath, func) {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        const mockFunc = function mock(...args) {
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
                result
                    .then((res) => that.afterCall(id, res, true))
                    .catch((e) => that.afterCall(id, { __$__: "Error", value: e.toString() }, true));
            }
            else {
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
    callMockMethod(moduleName, exportPath, methodName, method, obj, ...args) {
        const id = (+new Date()).toString() + Math.floor(Math.random() * 1000000).toString();
        this.beforeCall(id, moduleName, exportPath + "." + methodName, this.parseArgs(moduleName, exportPath, [obj, ...args]));
        obj.___$___methodsCalls.push({ methodName, args: this.parseArgs(moduleName, exportPath, args) });
        const result = method(...args);
        if (result instanceof Promise) {
            result
                .then((res) => this.afterCall(id, res, true))
                .catch((e) => this.afterCall(id, { __$__: "Error", value: e.toString() }, true));
        }
        else {
            this.afterCall(id, result, false);
        }
        return result;
    }
    parseArgs(moduleName, exportPath, args) {
        return args.map((arg) => this.parseAnyArgs(moduleName, exportPath, arg));
    }
    parseAnyArgs(moduleName, exportPath, value) {
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
                    throw new Error("Unknown function " + value);
                }
                return { __$__: "function", moduleName: func.moduleName, exportPath: func.exportPath };
            case "object":
                if (Array.isArray(value)) {
                    return value.map((v) => this.parseAnyArgs(moduleName, exportPath, v));
                }
                if (util_1.isPlainObject(value)) {
                    const returns = {};
                    for (const objectKey of Object.keys(value)) {
                        returns[objectKey] = this.parseAnyArgs(moduleName, exportPath + "." + objectKey, value[objectKey]);
                    }
                    return returns;
                }
                if (value instanceof Error) {
                    return {
                        __$__: "Error",
                        value: value.toString(),
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
                throw new Error("Unknown object " + value.constructor.name);
        }
    }
    hasModule(moduleName) {
        return !!this.modules[moduleName];
    }
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    beforeCall(id, moduleName, exportPath, args) {
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
    afterCall(id, result, isPromise) {
        const logger = this.config.logger;
        const call = this.calls.filter((c) => c.id === id)[0];
        logger.log("");
        logger.log("Test ::", "\x1b[35m" + call.moduleName + "\x1b[0m");
        logger.log("\x1b[33m%s\x1b[0m", call.exportPath, call.args, "->", "\x1b[32m" +
            JSON.stringify(result) + "\x1b[0m");
        result = this.parseAnyArgs(call.moduleName, call.exportPath, result);
        const expectedCall = this.expectedCalls.find((c) => deepEqual(c.args, call.args)
            && c.moduleName === call.moduleName && c.exportPath === call.exportPath);
        if (expectedCall) {
            if (!deepEqual(expectedCall.result, result) || isPromise !== expectedCall.isPromise) {
                this.hasUnexpected = true;
                logger.log("\x1b[41m%s%s%s\x1b[0m", "Unexpected result", " expected ", expectedCall.result, " real ", result);
                if (this.config.command === "update") {
                    logger.log("\x1b[36m%s%s%s\x1b[0m", "Test's result was updated", " expected ", expectedCall.result, " real ", result);
                    expectedCall.result = result;
                }
            }
        }
        call.result = result;
        call.isPromise = isPromise;
        // console.log(id, moduleName, exportPath, result);
    }
    getCalls() {
        return this.calls;
    }
}
exports.default = Registry;
