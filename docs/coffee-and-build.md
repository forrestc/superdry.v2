# Coffee and build

Coffee sources live under **`examples/todomvc/coffee/`**. The Worker loads the bundled **`src/app.js`**. See **`main`** in [`examples/todomvc/wrangler.toml`](../examples/todomvc/wrangler.toml).

---

## Build script

[`superdry/coffee-build`](../src/coffee-build.js) compiles every **`.coffee`** file, then Bun-bundles from **`coffee/app.coffee`**:

```js
// examples/todomvc/scripts/build-coffee.mjs
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
```

---

## Locale discovery

If the Coffee source tree has a **`locales/`** folder, `superdry/coffee-build` discovers direct **`.coffee`** files there and bundles them into Superdry's locale state. Prefix the default locale file with **`_`**:

```text
coffee/locales/_en.coffee
coffee/locales/zh.coffee
```

The underscore is only a default marker. The language keys become **`en`** and **`zh`**, so requests like **`/todos?lang=zh`** select Chinese copy. If no file is marked with **`_`**, the first sorted locale file is used as the default.

---

## npm scripts

From [`examples/todomvc/package.json`](../examples/todomvc/package.json):

- **`build:coffee`** — `bun ./scripts/build-coffee.mjs`
- **`watch:coffee`** — `bun ./scripts/watch-coffee.mjs --initial-build`
- **`dev`** — runs an initial build, then the Coffee watcher alongside Wrangler (see the file for the full shell one-liner)

**`watch:coffee`** re-runs the build when files under **`coffee/`** change ([`scripts/watch-coffee.mjs`](../examples/todomvc/scripts/watch-coffee.mjs) spawns the same build script).
