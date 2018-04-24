# treest

Real-automatic testing.

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

# Concept

Look at folder `__fixtures__`. We have 4 modules: `module1`, `module2`, `module3` and `ClassA`. Every module has own exports, like, functions or classes.

We want to have the unit tests for all of it.

BUT, we don't want to write it. Ok, Treest can do this instead of us!

Just call any function or method of class, which call some another function and Treest will be log (save to files) all calls, sub-calls and sub-sub-calls (so, Treest is TREE's teSTing).

Next time, when we start an executing of this function, Treest will compare the old and the new result (with same arguments) and throw error, if they will be different.

## Restrictions

Treest logged all functions arguments and results, so, it imposes some restrictions. Shortly, Treest can work only with serializable objects.

Treest supports all primitive js-types: boolean, plain-object, array, string, number, null, undefined.

Treest supports object, created by class or prototype. For passing by reference, Treest used a method toJSON of class for saving a state of object (really, Treest just used JSON.stringify).

Treest don't support the anonymouses functions, i know, it is big problem, but you can use property of class, like this:

```typescript
class A {
    public method1 = () => {
        // this.anotherMethod(); this exists in context
    };
}
function b(func: ()=>void){
    func();
}
const a = new A();
b(a.method1);
```

# Install

    npm install treest --save

    or 

    yarn add treest

# Usage

```typescript
import { Treest } from "treest";

const treest = new Treest();
const module1 = treest.require("./module1"); // require js-module with export-function `hello`
module1.hello("world"); // call function, log all sub-calls and write it to __treest__/%modulename%.json
//look at folder __treest__

```

# API

```typescript
interface ITreestConfig {
    mode?: string;
    mocks?: { [index: string]: () => any };
    ignoreMockModules?: string[];
    reporter?: typeof console;
    knownClasses?: Array<{
        class: any;
        name: string;
    }>;
    realRequire?: typeof require;
}
```

# Test

    npm install
    npm test

[npm-image]: https://badge.fury.io/js/treest.svg
[npm-url]: https://npmjs.org/package/treest
[travis-image]: https://travis-ci.org/arvitaly/treest.svg?branch=master
[travis-url]: https://travis-ci.org/arvitaly/treest
[daviddm-image]: https://david-dm.org/arvitaly/treest.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/arvitaly/treest
[coveralls-image]: https://coveralls.io/repos/arvitaly/treest/badge.svg
[coveralls-url]: https://coveralls.io/r/arvitaly/treest