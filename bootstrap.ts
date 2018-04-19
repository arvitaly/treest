import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { createInterface } from "readline";
// import resolveModulePath = require("resolve-module-path");
import withError from "with-error";
import Registry from "./Registry";
export interface ITreestConfig {
    mocks: any;
    setup: any;
}
export async function run(io: {
    console: typeof console;
}) {
    const command = process.argv[2];
    const testsPath = resolve(join(process.cwd(), "tests.json"));
    const { result: resultTests, error } = withError(() => JSON.parse(readFileSync(testsPath).toString()));
    const expectedTests: any[] = error ? [] : resultTests;
    const treestConfigPath = resolve(join(process.cwd(), "treest.config.js"));
    const config: ITreestConfig = require(treestConfigPath).default;
    if (config.setup) {
        await config.setup();
    }
    const registry = new Registry({
        logger: io.console, calls: expectedTests, command, rootPath: process.cwd(),
        mocks: config.mocks || {},
    });
    const tests: Array<{ name: string, fn: any }> = [];
    const oldTest = (global as any).test;
    (global as any).test = (name: string, fn: any) => {
        tests.push({ name, fn });
    };
    require(resolve(join(process.cwd(), "treest.tests.js")));

    for (const test of tests) {
        try {
            io.console.log("Start test ", test.name);
            await test.fn();
        } catch (e) {
            io.console.log("Error ", e);
            process.exit(1);
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
        const calls = registry.getCalls().filter((call) => call.moduleName !== "treest.config").map((call) => {
            return {
                ...call,
                id: undefined,
            };
        });
        writeFileSync(testsPath, JSON.stringify(calls, null, 2));
    }
    (global as any).test = oldTest;
}
