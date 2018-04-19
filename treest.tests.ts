import { hello } from "./__fixtures__/module1";
test("Hello, world!", async () => {
    await hello("Hello", "world");
});
test("Hello, John!", async () => {
    await hello("Hello", "John");
});
