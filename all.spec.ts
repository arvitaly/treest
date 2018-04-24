import Treest from "./Treest";
let treest: Treest;
beforeEach(() => {
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
