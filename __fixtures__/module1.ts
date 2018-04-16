import ClassA from "./ClassA";
import { addExclamation, concat } from "./module2";
import { apply } from "./module3";
export async function hello(greeting: string, name: string) {
    return apply(concat([greeting, name], new ClassA()), addExclamation);
}
