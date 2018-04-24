"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const with_error_1 = require("with-error");
const Treest_1 = require("./Treest");
let treest;
beforeEach(() => {
    with_error_1.default(() => fs_1.unlinkSync(__dirname + "/__treest__/__fixtures__/module1.json"));
    with_error_1.default(() => fs_1.unlinkSync(__dirname + "/__treest__/__fixtures__/module2.json"));
    with_error_1.default(() => fs_1.unlinkSync(__dirname + "/__treest__/__fixtures__/module3.json"));
    with_error_1.default(() => fs_1.unlinkSync(__dirname + "/__treest__/__fixtures__/ClassA.json"));
    treest = new Treest_1.default({
        mode: process.argv.indexOf("-u") > -1 ? "update" : "",
        mocks: {
            fs: () => {
                return {
                    readFileSync: (name) => {
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
it("hello, world", () => __awaiter(this, void 0, void 0, function* () {
    const { hello } = treest.require("./__fixtures__/module1");
    expect(yield hello("Hello", "world")).toBe("Hello, world!");
}));
it("hello, John", () => __awaiter(this, void 0, void 0, function* () {
    const { hello } = treest.require("./__fixtures__/module1");
    expect(yield hello("Hello", "John")).toBe("Hello, John!");
}));
afterEach(() => {
    require.cache = {};
    expect(JSON.parse(fs_1.readFileSync(__dirname + "/__treest__/__fixtures__/module1.json").toString())).toMatchSnapshot();
    expect(JSON.parse(fs_1.readFileSync(__dirname + "/__treest__/__fixtures__/module2.json").toString())).toMatchSnapshot();
    expect(JSON.parse(fs_1.readFileSync(__dirname + "/__treest__/__fixtures__/module3.json").toString())).toMatchSnapshot();
    expect(JSON.parse(fs_1.readFileSync(__dirname + "/__treest__/__fixtures__/ClassA.json").toString())).toMatchSnapshot();
});
