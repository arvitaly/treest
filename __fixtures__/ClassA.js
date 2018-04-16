"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClassA {
    constructor() {
        this.value = "";
        this.init();
    }
    init() {
        this.value = "value1";
    }
    getSeparator(mode = "dot") {
        return mode === "dot" ? "." : ",";
    }
}
exports.default = ClassA;
