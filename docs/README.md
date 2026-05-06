# Superdry v2 documentation

Examples are taken from [`examples/todomvc`](../examples/todomvc). Run it locally via [`examples/todomvc/README.md`](../examples/todomvc/README.md).

## Suggested reading order

1. **[HTML themes and components](html-themes-and-components.md)** — Build fragments (`todoRow`, `todoList`), compose the **`main`** region, wrap with **`layout`** from **`renderPage`**. Includes **camelCase → kebab-case** attributes and **`theme.importScript`**.
2. **[Form UX: submit loading](client-submit-loading.md)** — Why Superdry avoids optimistic UI by default; **`superdry-client.js`**, **`dataElemLoading`**, **`serveSuperdryClient`**.
3. **[Turbo Streams](turbo-streams.md)** — Reuse the **same** `todoRow` in a controller to refresh one list item after toggle (no duplicate markup).
4. **[Broadcast](broadcast.md)** — Push the same Turbo Stream to other windows with `broadcast 'toggle', id`.
5. **[App and routing](app-and-routing.md)** — Wire `newApp`, `GET /`, and `createRoute`.
6. **[Data and models](data-and-models.md)** — Drizzle table and queries.
7. **[Coffee and build](coffee-and-build.md)** — `superdry/coffee-build` and npm scripts.

## Topic index

- [App and routing](app-and-routing.md)
- [HTML themes and components](html-themes-and-components.md)
- [Form UX: submit loading](client-submit-loading.md)
- [Turbo Streams](turbo-streams.md)
- [Broadcast](broadcast.md)
- [Data and models](data-and-models.md)
- [Coffee and build](coffee-and-build.md)

## Package entry points

- `superdry` — router, `createComponent`, Turbo `res.stream`, `broadcast`, optional Preact helpers
- `superdry/html` — HTML theme implementation (used by `createTheme` on the main package)
- `superdry/model` — model definitions, validations, and Drizzle sqlite re-exports
- `superdry/broadcast` — broadcast adapter factories and Durable Object class
- `superdry/coffee-build` — CoffeeScript compile + Bun bundle

The root [README.md](../README.md) has philosophy, stack, and quick start.
