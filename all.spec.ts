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

it("hello", async () => {
    expect(await treest.require("./__fixtures__/module1")
        .hello("Hello", "world"),
    ).toBe("Hello, world!");
});
