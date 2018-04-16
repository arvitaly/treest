"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function concat(args, sep) {
    return args.join(sep.getSeparator("comma") + " ");
}
exports.concat = concat;
function addExclamation(str) {
    return str + "!";
}
exports.addExclamation = addExclamation;
