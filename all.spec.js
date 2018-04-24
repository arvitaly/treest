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
const Treest_1 = require("./Treest");
let treest;
beforeEach(() => {
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
it("hello", () => __awaiter(this, void 0, void 0, function* () {
    expect(yield treest.require("./__fixtures__/module1")
        .hello("Hello", "world")).toBe("Hello, world!");
}));
