"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
class ClassA {
    constructor() {
        this.value = "";
        this.init();
    }
    init() {
        this.value = "value1";
    }
    getSeparator(mode = "dot") {
        return mode === "dot" ? fs_1.readFileSync("./dot.txt").toString() : fs_1.readFileSync("./comma.txt").toString();
    }
}
exports.default = ClassA;
