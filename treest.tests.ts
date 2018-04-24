import { hello } from "./__fixtures__/module1";
/*it("Hello, world!", );
it("Hello, John!", async () => {
    await hello("Hello", "John");
});*/
export default {
    func: async () => {
        await hello("Hello", "world");
    },
};
