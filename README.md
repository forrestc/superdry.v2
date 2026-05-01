# Superdry v2: The Edge Edition

**"No-API. One Language. Zero Boilerplate."**

Superdry v2 is a modern, server-first fullstack framework designed for the 2026 web ecosystem. It is inspired by the **stateful power of Elixir Phoenix** and the **simplicity of Rails Hotwire** in the **JavaScript/Bun ecosystem**.

Built specifically for **Cloudflare Workers + D1**, Superdry v2 uses **CoffeeScript** to provide a unified, low-token-usage DSL for logic, UI, and styling.

**Documentation:** [docs/README.md](docs/README.md) (topics with code from `examples/todomvc`).

---

## 🚀 The Philosophy: Why v2?

1.  **The "No-API" Rule**: No REST, no GraphQL, no JSON bridges. Your Store logic runs on the Edge and talks to the Database (D1) directly. The framework handles the synchronization.
2.  **Zero-Hook Interactivity**: Say goodbye to `useEffect` and `useState` hell. Reactivity is handled via implicit Signals in the Store.
3.  **One Language (CoffeeScript)**: Logic, Database Schemas, Tailwind-powered Themes, and UI Components are all written in clean, indentation-based CoffeeScript.
4.  **AI-Vibe Friendly**: By removing braces, semicolons, and boilerplate, your AI coding assistants use ~40% fewer tokens to generate more reliable code.

---

## ⚠️ Current example: TodoMVC

[`examples/todomvc`](examples/todomvc) is the reference app. It ships with:

- **Server-rendered HTML** on **`GET /`** (layout, list, forms).
- **No JSON API** for CRUD; handlers use **Drizzle + D1** directly.
- **Turbo Streams** for mutations: **`POST /todos`**, **`PATCH /todos/:id/toggle`**, **`DELETE /todos/:id`** return **`text/vnd.turbo-stream.html`** that updates fragments by DOM id (see [docs/turbo-streams.md](docs/turbo-streams.md)).
- **Coffee-first** sources under **`examples/todomvc/coffee/`**; **`bun run build:coffee`** (or **`watch:coffee`**) produces **`examples/todomvc/src/app.js`**, the Worker **`main`** in `wrangler.toml`.

---

## 🗺️ Roadmap (remaining polish)

The TodoMVC example already uses **HTML-over-the-wire** via Turbo Streams. Possible next steps:

- **Progressive enhancement** — explicit non-Turbo fallbacks (for example **`303`** redirects) where you want bare form posts without JS.
- **Turbo Frames** — finer-grained navigation and lazy regions, still HTML-only.
- **Tests** — Worker integration tests for add/toggle/delete/filter; assert no JSON mutation endpoints.
- **Framework vs example** — keep squeezing generic pieces into `superdry` only when multiple apps need them (see [`.cursor/rules/superdry-workflow.mdc`](.cursor/rules/superdry-workflow.mdc)).

---

## 🛠 The Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Engine**: Bun (Build tool & Loader)
- **Logic/UI**: CoffeeScript 2 + Preact (Preact/theme proxy optional; TodoMVC uses HTML string themes)
- **ORM**: Drizzle (with native D1 driver)
- **CSS**: Tailwind (via CDN in the example; class map on the theme)

---

## Superdry Runtime API

`superdry` exposes a runtime API for Worker apps:

- `newApp(config)` — request router, `GET /` page pipeline, `app.route` mounting, `res.stream` Turbo helper
- `createComponent(renderFn)` — fragment / page renderer
- `createTheme(themeDef)` — HTML tag proxy + `classes` map (from `superdry/html`)

TodoMVC-style wiring is in [docs/app-and-routing.md](docs/app-and-routing.md). Minimal shape:

```coffee
import { newApp } from 'superdry'

app = newApp
  parseState: ({ url }) ->
    filter: url.searchParams.get('filter') ? 'all'
  loadPageData: (app) ->
    { todos: [] }
  renderPage: ({ app, data }) ->
    "<html><body>#{data.todos.length} todos</body></html>"

export default app
```

---

## 📁 Project Structure

```text
.
├── src/
│   ├── superdry.js       # Core: router, streams, components, optional Preact helpers
│   ├── html.js           # HTML theme / escaping
│   ├── model.js          # Drizzle re-exports for apps
│   └── coffee-build.js   # Coffee compile + Bun bundle helper
├── docs/                 # Topic documentation (TodoMVC-sourced examples)
├── examples/todomvc/
│   ├── coffee/
│   │   ├── app.coffee           # newApp + export default
│   │   ├── controllers/         # createRoute groups
│   │   ├── models/              # Drizzle table + queries
│   │   └── themes/              # createTheme + components
│   ├── scripts/
│   │   ├── build-coffee.mjs
│   │   └── watch-coffee.mjs
│   ├── src/app.js               # Generated Worker bundle (after build:coffee)
│   ├── wrangler.toml
│   ├── drizzle.config.ts
│   ├── schema.sql
│   └── package.json
└── package.json          # Library package
```

---

## Contributing

Agent and contributor conventions live in [`.cursor/rules/superdry-workflow.mdc`](.cursor/rules/superdry-workflow.mdc); in Cursor this project rule is loaded automatically (`alwaysApply: true`).

---

## Run TodoMVC Locally

```bash
cd examples/todomvc
bun install
bun run build:coffee
bun run db:up
bun run dev
```

Then open [http://localhost:8787](http://localhost:8787).

For Coffee-first development:

```bash
cd examples/todomvc
bun run watch:coffee
```

Edit files under `examples/todomvc/coffee/`; the watcher rebuilds `examples/todomvc/src/app.js`. For a one-shot build, use `bun run build:coffee`.

---

## Deploy TodoMVC to Cloudflare Workers

1. Create a D1 database:

```bash
cd examples/todomvc
bunx wrangler d1 create todo-db
```

2. Copy the returned `database_id` into `examples/todomvc/wrangler.toml` under `[[d1_databases]]`.

3. Apply schema to remote D1:

```bash
bun run db:up:remote
```

4. Deploy:

```bash
bun run deploy
```
