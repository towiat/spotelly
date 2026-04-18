export default {
  arrowParens: "avoid",
  endOfLine: "lf",
  printWidth: 100,
  tabWidth: 2,
  overrides: [
    {
      files: ["./src/*.html"],
      options: {
        printWidth: 100,
      },
    },
  ],
};
