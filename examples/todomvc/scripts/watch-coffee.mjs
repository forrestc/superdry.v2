import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { watch } from "node:fs";

const projectRoot = process.cwd();
const coffeeRoot = path.join(projectRoot, "coffee");
const buildOnStart = process.argv.includes("--initial-build");

const scanCoffeeFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scanCoffeeFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".coffee")) {
      files.push(fullPath);
    }
  }
  return files;
};

const fileState = new Map();

const refreshState = async () => {
  const files = await scanCoffeeFiles(coffeeRoot);
  const nextState = new Map();
  for (const file of files) {
    const info = await stat(file);
    nextState.set(file, info.mtimeMs);
  }
  return nextState;
};

const hasChanges = (nextState) => {
  if (nextState.size !== fileState.size) return true;
  for (const [file, mtime] of nextState) {
    if (fileState.get(file) !== mtime) return true;
  }
  return false;
};

const runBuild = async () => {
  const proc = Bun.spawn({
    cmd: ["bun", "./scripts/build-coffee.mjs"],
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error("[watch:coffee] build failed with exit code", exitCode);
  }
};

let buildQueued = false;
let buildRunning = false;

const queueBuild = async () => {
  if (buildRunning) {
    buildQueued = true;
    return;
  }
  buildRunning = true;
  await runBuild();
  const nextState = await refreshState();
  fileState.clear();
  for (const [file, mtime] of nextState) fileState.set(file, mtime);
  buildRunning = false;
  if (buildQueued) {
    buildQueued = false;
    await queueBuild();
  }
};

const watchedDirs = new Map();

const watchDirRecursive = async (dir) => {
  if (watchedDirs.has(dir)) return;
  const watcher = watch(dir, async (_eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(dir, filename.toString());
    try {
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        await watchDirRecursive(fullPath);
      }
    } catch {
      // file/dir may have been removed; ignore
    }
    const nextState = await refreshState();
    if (hasChanges(nextState)) {
      await queueBuild();
    }
  });
  watchedDirs.set(dir, watcher);

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await watchDirRecursive(path.join(dir, entry.name));
    }
  }
};

const bootstrap = async () => {
  const initialState = await refreshState();
  for (const [file, mtime] of initialState) fileState.set(file, mtime);
  await watchDirRecursive(coffeeRoot);
  console.log("[watch:coffee] watching", coffeeRoot);
  if (buildOnStart) {
    await runBuild();
  }
};

await bootstrap();
