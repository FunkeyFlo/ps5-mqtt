const js = require("@eslint/js")
const tseslint = require("typescript-eslint")
const react = require("eslint-plugin-react")
const prettier = require("eslint-config-prettier")
const globals = require("globals")

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      ".yarn/**",
      ".pnp.*",
      "**/.packaged/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  prettier,
  {
    settings: {
      react: {
        version: "18.3",
      },
    },
    rules: {
      "@typescript-eslint/prefer-namespace-keyword": "off",
      "@typescript-eslint/no-namespace": "off",
      "no-extra-boolean-cast": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    files: ["eslint.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
)
