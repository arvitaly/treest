export function concat(args: any[], sep: { getSeparator: (sep: "dot" | "comma") => string }) {
    return args.join(sep.getSeparator("comma") + " ");
}
export function addExclamation(str: string) {
    return str + "!";
}
