import { Console } from "console";
import { join, resolve } from "path";
import Registry from "./Registry";
export interface ITreestConfig {
    mode?: string;
    mocks?: { [index: string]: () => any };
    ignoreMockModules?: string[];
    reporter?: typeof console;
    knownClasses?: Array<{
        class: any;
        name: string;
    }>;
    realRequire?: typeof require;
}
class Treest {
    protected registry: Registry;
    protected testsPath: string;
    constructor(protected config: ITreestConfig = {}) {
        this.testsPath = resolve(join(process.cwd(), "__treest__"));
        this.registry = new Registry({
            logger: config.reporter || new Console(process.stdout, process.stderr),
            callsPath: this.testsPath,
            command: this.config.mode || "",
            rootPath: process.cwd(),
            mocks: config.mocks || {},
            ignoreMockModules: config.ignoreMockModules || [],
            knownClasses: config.knownClasses || [],
            realRequire: this.config.realRequire,
        });
    }
    public require(modulePath: string) {
        this.registry.mockRequire();
        const returns = this.registry.requireModule(modulePath, module);
        this.registry.unmockRequire();
        return returns;
    }
    public report() {
        const logger = this.config.reporter || console;
        this.registry.getCalls().map((call) => {
            logger.log("");
            logger.log("Test ::", "\x1b[35m" + call.moduleName + "\x1b[0m");
            logger.log("\x1b[33m%s\x1b[0m", call.exportPath, call.args, "->", "\x1b[32m" +
                JSON.stringify(call.result, null, 2) + "\x1b[0m");
        });
    }
}
export default Treest;
