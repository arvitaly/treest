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
const with_error_1 = require("with-error");
const Registry_1 = require("./Registry");
function run(io) {
    return __awaiter(this, void 0, void 0, function* () {
        const command = process.argv[2];
        const testsPath = path_1.resolve(path_1.join(process.cwd(), "tests.json"));
        const { result: resultTests, error } = with_error_1.default(() => JSON.parse(fs_1.readFileSync(testsPath).toString()));
        const tests = error ? [] : resultTests;
        const treestConfigPath = path_1.resolve(path_1.join(process.cwd(), "treest.config.js"));
        const config = require(treestConfigPath).default;
        const registry = new Registry_1.default({ logger: io.console, calls: tests, command, rootPath: process.cwd() });
        for (const test of config.tests) {
            const mod = require(test.module);
            yield mod[test.exportName](...test.args);
        }
        fs_1.writeFileSync(testsPath, JSON.stringify(registry.getCalls()));
    });
}
exports.run = run;
