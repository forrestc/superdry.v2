import { buildCoffeeProject } from "superdry/coffee-build";

await buildCoffeeProject({
  projectRoot: process.cwd(),
  sourceDir: "coffee",
  entryFile: "app.coffee",
  outputDir: "src",
  outputFile: "app.js",
  tempBuildDir: ".coffee-build",
  target: "browser",
  cleanTempDir: true,
});