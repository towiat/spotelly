import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import html from "eslint-plugin-html";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    rules: {
      eqeqeq: "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "no-shadow": ["error", { builtinGlobals: true }],
      "no-var": "error",
      "no-use-before-define": ["error", { functions: false, variables: false }],
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
  {
    files: ["dist/*.js", "src/*.js"],
    rules: {
      "func-names": ["error", "never"],
      "func-style": ["error", "declaration"],
      "no-delete-var": ["off"],
      "object-shorthand": ["error", "never"],
    },
    languageOptions: {
      globals: {
        atob: "readonly",
        console: "readonly",
        HTTPServer: "readonly",
        Script: "readonly",
        Shelly: "readonly",
        Timer: "readonly",
      },
      sourceType: "script",
    },
  },
  {
    files: ["*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    rules: {
      "prefer-const": ["error", { destructuring: "all" }],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ace: "readonly",
      },
    },
  },
  eslintConfigPrettier,
];
