"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const readline_1 = require("readline");
// import resolveModulePath = require("resolve-module-path");
const with_error_1 = require("with-error");
const Registry_1 = require("./Registry");
function run(io) {
    return __awaiter(this, void 0, void 0, function* () {
        const command = process.argv[2];
        const testsPath = path_1.resolve(path_1.join(process.cwd(), "tests.json"));
        const { result: resultTests, error } = with_error_1.default(() => JSON.parse(fs_1.readFileSync(testsPath).toString()));
        const expectedTests = error ? [] : resultTests;
        const treestConfigPath = path_1.resolve(path_1.join(process.cwd(), "treest.config.js"));
        const config = require(treestConfigPath).default;
        if (config.setup) {
            yield config.setup();
        }
        const registry = new Registry_1.default({
            logger: io.console, calls: expectedTests, command, rootPath: process.cwd(),
            mocks: config.mocks || {},
        });
        const tests = [];
        const oldTest = global.test;
        global.test = (name, fn) => {
            tests.push({ name, fn });
        };
        require(path_1.resolve(path_1.join(process.cwd(), "treest.tests.js")));
        for (const test of tests) {
            try {
                io.console.log("Start test ", test.name);
                yield test.fn();
            }
            catch (e) {
                io.console.log("Error ", e);
                process.exit(1);
            }
        }
        if (registry.hasUnexpected) {
            const rl = readline_1.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: false,
            });
            io.console.log("Found unexpected result in tests, for update press `u`, for quit `q`");
            rl.on("line", (cmd) => {
                if (cmd === "u") {
                    const calls = registry.getCalls().filter((call) => call.moduleName !== "treest.config");
                    fs_1.writeFileSync(testsPath, JSON.stringify(calls));
                    rl.close();
                    process.exit(0);
                }
                if (cmd === "q") {
                    process.exit(1);
                }
            });
        }
        else {
            const calls = registry.getCalls().filter((call) => call.moduleName !== "treest.config");
            fs_1.writeFileSync(testsPath, JSON.stringify(calls, null, 2));
        }
        global.test = oldTest;
    });
}
exports.run = run;
