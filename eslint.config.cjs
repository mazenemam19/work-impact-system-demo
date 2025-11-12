module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "module" },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
