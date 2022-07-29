module.exports = {
    parser: "@babel/eslint-parser",
    "env": {
    "jest": true,
          "browser": true,
          "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended" ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "react-hooks",
        "@getify/proper-arrows"
    ],
    "rules": {
        "no-unused-vars": ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
        "react/prop-types": [0],
        "react/jsx-uses-react": "error",
        "react/jsx-uses-vars": "error",
        "react/display-name": [0, { "ignoreTranspilerName": false }],
        "react/jsx-indent": [2, 2, {checkAttributes: true}],
        "react-hooks/rules-of-hooks": "error", // Checks rules of Hooks
        "react-hooks/exhaustive-deps": "warn", // Checks effect dependencies
        "@getify/proper-arrows/params": ["error", {"unused": "all", "count": 30, "length": 3, "allowed": ["e", "err", "i", "j", "k", "id", "a", "b", "_"], "trivial": false}],
    }
};
