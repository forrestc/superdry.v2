import path from "node:path";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import CoffeeScript from "coffeescript";
import appCoffeeSource from "../coffee/app.coffee" with { type: "text" };
import todoControllerCoffeeSource from "../coffee/controllers/todo.coffee" with { type: "text" };
import todoModelCoffeeSource from "../coffee/models/todo.coffee" with { type: "text" };
import themeIndexCoffeeSource from "../coffee/themes/index.coffee" with { type: "text" };
import themeComponentsCoffeeSource from "../coffee/themes/components.coffee" with { type: "text" };

const projectRoot = process.cwd();
const coffeeDir = path.join(projectRoot, "coffee");
const outDir = path.join(projectRoot, ".coffee-build");
const bundleEntry = path.join(outDir, "app.js");
const outFile = path.join(projectRoot, "src", "index.js");

// Keep explicit Coffee imports so `bun --watch` reruns this script on source edits.
const watchInputs = [
  appCoffeeSource,
  todoControllerCoffeeSource,
  todoModelCoffeeSource,
  themeIndexCoffeeSource,
  themeComponentsCoffeeSource,
];
if (watchInputs.length < 5) {
  throw new Error("Coffee watch inputs missing");
}

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".coffee")) {
      files.push(fullPath);
    }
  }
  return files;
};

const compileCoffeeFiles = async () => {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const coffeeFiles = await walk(coffeeDir);
  for (const filePath of coffeeFiles) {
    const relPath = path.relative(coffeeDir, filePath);
    const jsRelPath = relPath.replace(/\.coffee$/, ".js");
    const outPath = path.join(outDir, jsRelPath);
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

const bundleCompiledEntry = async () => {
  const bundleResult = await Bun.build({
    entrypoints: [bundleEntry],
    outdir: path.join(projectRoot, "src"),
    format: "esm",
    sourcemap: "external",
    target: "browser",
  });

  if (!bundleResult.success) {
    for (const log of bundleResult.logs) {
      console.error(log.message);
    }
    process.exit(1);
  }

  try {
    await stat(outFile);
  } catch {
    throw new Error(`Coffee build succeeded but missing output: ${outFile}`);
  }
};

try {
  await compileCoffeeFiles();
  await bundleCompiledEntry();
} finally {
  // Keep `.coffee-build` ephemeral to avoid confusion about the runtime entrypoint.
  // `src/index.js` is the only persistent generated artifact used by Wrangler.
  await rm(outDir, { recursive: true, force: true });
}
