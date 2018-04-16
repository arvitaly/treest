import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
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
    const config: ITreestConfig = require(treestConfigPath).default;

    const registry = new Registry({ logger: io.console, calls: tests, command, rootPath: process.cwd() });
    for (const test of config.tests) {
        const mod = require(test.module);
        await mod[test.exportName](...test.args);
    }
    writeFileSync(testsPath, JSON.stringify(registry.getCalls()));
}
