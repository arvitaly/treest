export default {
    tests: [{
        module: "./__fixtures__/module1",
        exportName: "hello",
        args: ["Hello", "world"],
    }, {
        module: "./__fixtures__/module1",
        exportName: "hello",
        args: ["Hello", "John"],
    }],
};
