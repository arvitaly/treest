import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { createInterface } from "readline";
import resolveModulePath = require("resolve-module-path");
import withError from "with-error";
import Registry from "./Registry";
export interface ITreestConfig {
    tests: Array<{
        module: string;
        exportName: string;
        args: any[];
    }>;
}
export async function run(io: { console: typeof console }) {
    const command = process.argv[2];
    const testsPath = resolve(join(process.cwd(), "tests.json"));
    const { result: resultTests, error } = withError(() => JSON.parse(readFileSync(testsPath).toString()));
    const tests: any[] = error ? [] : resultTests;
    const treestConfigPath = resolve(join(process.cwd(), "treest.config.js"));
    const registry = new Registry({ logger: io.console, calls: tests, command, rootPath: process.cwd() });
    const config: ITreestConfig = require(treestConfigPath).default;
    for (const test of config.tests) {
        const mod = require(resolveModulePath(test.module, {
            basePath: process.cwd(),
            npmPath: resolve(join(process.cwd(), "node_modules")),
        }));
        try {
            await mod[test.exportName](...test.args);
        } catch (e) {
            //
        }
    }
    if (registry.hasUnexpected) {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
        io.console.log("Found unexpected result in tests, for update press `u`, for quit `q`");
        rl.on("line", (cmd) => {
            if (cmd === "u") {
                const calls = registry.getCalls().filter((call) => call.moduleName !== "treest.config");
                writeFileSync(testsPath, JSON.stringify(calls));
                rl.close();
                process.exit(0);
            }
            if (cmd === "q") {
                process.exit(1);
            }
        });
    } else {
        const calls = registry.getCalls().filter((call) => call.moduleName !== "treest.config");
        writeFileSync(testsPath, JSON.stringify(calls));
    }
}
