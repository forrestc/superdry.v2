# Superdry v2: The Edge Edition

**"No-API. One Language. Zero Boilerplate."**

Superdry v2 is a modern, server-first fullstack framework designed for the 2026 web ecosystem. It is inspired by the **stateful power of Elixir Phoenix** and the **simplicity of Rails Hotwire** in the **JavaScript/Bun ecosystem**.

Built specifically for **Cloudflare Workers + D1**, Superdry v2 uses **CoffeeScript** to provide a unified, low-token-usage DSL for logic, UI, and styling.

---

## 🚀 The Philosophy: Why v2?

1.  **The "No-API" Rule**: No REST, no GraphQL, no JSON bridges. Your Store logic runs on the Edge and talks to the Database (D1) directly. The framework handles the synchronization.
2.  **Zero-Hook Interactivity**: Say goodbye to `useEffect` and `useState` hell. Reactivity is handled via implicit Signals in the Store.
3.  **One Language (CoffeeScript)**: Logic, Database Schemas, Tailwind-powered Themes, and UI Components are all written in clean, indentation-based CoffeeScript.
4.  **AI-Vibe Friendly**: By removing braces, semicolons, and boilerplate, your AI coding assistants use ~40% fewer tokens to generate more reliable code.

---

## ⚠️ Current Example Status (Important)

`examples/todomvc` currently ships in a **working server-rendered mode with Turbo partial updates** and a **Coffee-first authoring workflow**.

- **What it does now**
  - No JSON API is used for CRUD.
  - Forms post to the Worker, the Worker updates D1, then returns `303 See Other`.
  - Browser follows the redirect and reloads the full page (`POST -> 303 -> GET`).
- **What it does not do yet**
  - No Turbo/HTMX-style partial HTML replacement.
  - No in-place fragment swap from server-returned HTML snippets.
- **Where code currently runs**
  - Worker runtime entry is `examples/todomvc/src/index.js` (generated build artifact).
  - Source of truth lives in `examples/todomvc/coffee/*.coffee`.
  - Use `bun run build:coffee` or `bun run watch:coffee` to regenerate `src/index.js`.

---

## 🗺️ Roadmap to True HTML-over-the-Wire

The goal is to keep the **No-API** rule while replacing full-page reloads with server-rendered partial HTML updates.

1. **Introduce fragment boundaries**
   - Split page rendering into reusable fragments (todo list, counter/footer, filter state).
   - Give each fragment stable DOM IDs/targets.
2. **Add partial response endpoints**
   - Keep `POST /todos`, `POST /todos/:id/toggle`, `POST /todos/:id/delete`.
   - For progressive enhancement:
     - If request is a normal form post, continue `303` redirect.
     - If request is a Turbo-enhanced request, return Turbo-friendly HTML responses instead.
3. **Adopt `node-turbo` as the transport layer**
   - Add `node-turbo` to the TodoMVC example and ship Turbo in progressive-enhancement mode.
   - Use Turbo Frames/Streams conventions for server-rendered updates.
   - Keep the protocol HTML-only (no JSON API backchannel).
4. **Wire client-side enhancement (small JS only)**
   - Initialize Turbo on the client for navigation/form enhancement.
   - Apply server-returned Turbo frame/stream updates to target regions without full navigation.
   - Preserve non-JS fallback behavior.
5. **Reconnect Coffee/Superdry runtime path**
   - Move rendering/store logic from ad-hoc `src/index.js` into framework-driven Coffee components.
   - Ensure Worker bundling supports the Coffee entry path cleanly.
6. **Lock behavior with tests**
   - Add Worker integration tests for add/toggle/delete/filter in both fallback and enhanced modes.
   - Verify no JSON endpoint is introduced and partial responses remain HTML-only.

---

## 🛠 The Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Engine**: Bun (Build tool & Loader)
- **Logic/UI**: CoffeeScript 2 + Preact
- **ORM**: Drizzle (with native D1 driver)
- **CSS**: Tailwind v4 (via Theme Proxy)

---

## Superdry Runtime API

`superdry` now exposes a higher-level runtime API for worker apps:

- `newApp(config)` - worker request router + Turbo/PRG response helpers
- `createComponent(renderFn)` - small component/fragment wrapper
- `createTheme(themeDef)` - theme proxy creator

Minimal Todo-style usage:

```js
import { newApp, createComponent, createTheme } from "superdry";

const theme = createTheme({ app: "min-h-screen" });
const renderPage = createComponent(({ data, state }) => `<main class="${state.theme.app}">...</main>`);

export default newApp({
  parseState: ({ url }) => ({ filter: url.searchParams.get("filter") ?? "all", theme }),
  loadPageData: async ({ env, state }) => ({ todos: await fetchTodos(env.DB, state.filter) }),
  renderPage,
  routes: [
    { method: "POST", path: "/todos", handler: addTodo },
    { method: "POST", path: "/todos/:id/toggle", handler: toggleTodo },
  ],
});
```

---

## 📁 Project Structure

```text
.
├── src/
│   └── superdry.js         # The Core Engine (Theme Proxy & Store Logic)
├── examples/todomvc/
│   ├── coffee/
│   │   ├── schema.coffee   # Drizzle Database Schema
│   │   ├── theme.coffee    # Theme + HTML components
│   │   ├── app.coffee      # Routes + app wiring
│   │   └── index.coffee    # Coffee bundle entry
│   ├── src/index.js        # Generated Worker entry used by Wrangler
│   ├── wrangler.toml       # Cloudflare Config
│   ├── drizzle.config.ts   # Database Migration Config
│   ├── schema.sql          # D1 bootstrap schema for local/remote
│   └── package.json
└── package.json            # Root Library Config
```

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

Edit files under `examples/todomvc/coffee/` and the watcher will regenerate `examples/todomvc/src/index.js`.

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
