import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([".wxt", "coverage", "tmp"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: globals.browser,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
]);
