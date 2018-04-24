import { readFileSync, unlinkSync } from "fs";
import withError from "with-error";
import Treest from "./Treest";
let treest: Treest;
beforeEach(() => {
    withError(() => unlinkSync(__dirname + "/__treest__/__fixtures__/module1.json"));
    withError(() => unlinkSync(__dirname + "/__treest__/__fixtures__/module2.json"));
    withError(() => unlinkSync(__dirname + "/__treest__/__fixtures__/module3.json"));
    withError(() => unlinkSync(__dirname + "/__treest__/__fixtures__/ClassA.json"));
    treest = new Treest({
        mode: process.argv.indexOf("-u") > -1 ? "update" : "",
        mocks: {
            fs: () => {
                return {
                    readFileSync: (name: string) => {
                        if (name === "./dot.txt") {
                            return ".";
                        }
                        return ",";
                    },
                };
            },
        },
    });
});

it("hello, world", async () => {
    const { hello } = treest.require("./__fixtures__/module1");
    expect(
        await hello("Hello", "world"),
    ).toBe("Hello, world!");
});
it("hello, John", async () => {
    const { hello } = treest.require("./__fixtures__/module1");
    expect(
        await hello("Hello", "John"),
    ).toBe("Hello, John!");
});
afterEach(() => {
    require.cache = {};
    expect(JSON.parse(readFileSync(__dirname + "/__treest__/__fixtures__/module1.json").toString())).toMatchSnapshot();
    expect(JSON.parse(readFileSync(__dirname + "/__treest__/__fixtures__/module2.json").toString())).toMatchSnapshot();
    expect(JSON.parse(readFileSync(__dirname + "/__treest__/__fixtures__/module3.json").toString())).toMatchSnapshot();
    expect(JSON.parse(readFileSync(__dirname + "/__treest__/__fixtures__/ClassA.json").toString())).toMatchSnapshot();
});
