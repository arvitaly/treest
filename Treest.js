"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const path_1 = require("path");
const Registry_1 = require("./Registry");
process.on("unhandledRejection", (e) => {
    if (e instanceof Registry_1.UnexpectedResultError) {
        console.log.call(console, e.toString());
    }
});
class Treest {
    constructor(config = {}) {
        this.config = config;
        this.testsPath = path_1.resolve(path_1.join(process.cwd(), "__treest__"));
        this.reporter = config.reporter || new console_1.Console(process.stdout, process.stderr);
        this.registry = new Registry_1.default({
            logger: this.reporter,
            callsPath: this.testsPath,
            command: this.config.mode || "",
            rootPath: process.cwd(),
            mocks: config.mocks || {},
            ignoreMockModules: config.ignoreMockModules || [],
            knownClasses: config.knownClasses || [],
            realRequire: this.config.realRequire,
        });
    }
    require(modulePath) {
        this.registry.mockRequire();
        const returns = this.registry.requireModule(modulePath, module);
        this.registry.unmockRequire();
        return returns;
    }
    report() {
        const logger = this.config.reporter || console;
        this.registry.getCalls().map((call) => {
            logger.log("");
            logger.log("Test ::", "\x1b[35m" + call.moduleName + "\x1b[0m");
            logger.log("\x1b[33m%s\x1b[0m", call.exportPath, call.args, "->", "\x1b[32m" +
                JSON.stringify(call.result, null, 2) + "\x1b[0m");
        });
    }
}
exports.default = Treest;
