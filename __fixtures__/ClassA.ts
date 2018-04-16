export default class ClassA {
    protected value = "";
    constructor() {
        this.init();
    }
    public init() {
        this.value = "value1";
    }
    public getSeparator(mode: "dot" | "comma" = "dot") {
        return mode === "dot" ? "." : ",";
    }

}
