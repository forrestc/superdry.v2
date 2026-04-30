import path from "node:path";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import CoffeeScript from "coffeescript";

const walkCoffeeFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkCoffeeFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".coffee")) {
      files.push(fullPath);
    }
  }
  return files;
};

const compileCoffeeTree = async ({ sourceDir, tempBuildDir }) => {
  await rm(tempBuildDir, { recursive: true, force: true });
  await mkdir(tempBuildDir, { recursive: true });

  const coffeeFiles = await walkCoffeeFiles(sourceDir);
  for (const filePath of coffeeFiles) {
    const relPath = path.relative(sourceDir, filePath);
    const jsRelPath = relPath.replace(/\.coffee$/, ".js");
    const outPath = path.join(tempBuildDir, jsRelPath);
    const outMapPath = `${outPath}.map`;
    await mkdir(path.dirname(outPath), { recursive: true });

    const source = await readFile(filePath, "utf8");
    const compiled = CoffeeScript.compile(source, {
      filename: filePath,
      bare: true,
      sourceMap: true,
      inlineMap: false,
    });

    await writeFile(outPath, compiled.js, "utf8");
    await writeFile(outMapPath, compiled.v3SourceMap, "utf8");
  }
};

const bundleCompiledEntry = async ({ entrypoint, outputDir, expectedOutputFile, target }) => {
  const bundleResult = await Bun.build({
    entrypoints: [entrypoint],
    outdir: outputDir,
    format: "esm",
    sourcemap: "external",
    target,
  });

  if (!bundleResult.success) {
    for (const log of bundleResult.logs) {
      console.error(log.message);
    }
    throw new Error(`Coffee build failed for entrypoint: ${entrypoint}`);
  }

  try {
    await stat(expectedOutputFile);
  } catch {
    throw new Error(`Coffee build succeeded but missing output: ${expectedOutputFile}`);
  }
};

export const buildCoffeeProject = async ({
  projectRoot = process.cwd(),
  sourceDir = "coffee",
  entryFile = "app.coffee",
  outputDir = "src",
  outputFile = "app.js",
  tempBuildDir = ".coffee-build",
  target = "browser",
  cleanTempDir = true,
} = {}) => {
  const absoluteSourceDir = path.join(projectRoot, sourceDir);
  const absoluteTempBuildDir = path.join(projectRoot, tempBuildDir);
  const compiledEntrypoint = path.join(
    absoluteTempBuildDir,
    entryFile.replace(/\.coffee$/, ".js"),
  );
  const absoluteOutputDir = path.join(projectRoot, outputDir);
  const expectedOutputFile = path.join(absoluteOutputDir, outputFile);

  try {
    await compileCoffeeTree({
      sourceDir: absoluteSourceDir,
      tempBuildDir: absoluteTempBuildDir,
    });
    await bundleCompiledEntry({
      entrypoint: compiledEntrypoint,
      outputDir: absoluteOutputDir,
      expectedOutputFile,
      target,
    });
  } finally {
    if (cleanTempDir) {
      // Keep temp output ephemeral so app runtime entrypoint remains unambiguous.
      await rm(absoluteTempBuildDir, { recursive: true, force: true });
    }
  }
};
