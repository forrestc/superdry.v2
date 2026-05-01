# Superdry v2 documentation

Examples are taken from [`examples/todomvc`](../examples/todomvc). Run it locally via [`examples/todomvc/README.md`](../examples/todomvc/README.md).

## Suggested reading order

1. **[HTML themes and components](html-themes-and-components.md)** — Build a single fragment (`todoRow`), call it from a parent (`todoList`), place both in the page (`layout`).
2. **[Turbo Streams](turbo-streams.md)** — Reuse the **same** `todoRow` in a controller to refresh one list item after toggle (no duplicate markup).
3. **[App and routing](app-and-routing.md)** — Wire `newApp`, `GET /`, and `createRoute`.
4. **[Data and models](data-and-models.md)** — Drizzle table and queries.
5. **[Coffee and build](coffee-and-build.md)** — `superdry/coffee-build` and npm scripts.

## Topic index

- [App and routing](app-and-routing.md)
- [HTML themes and components](html-themes-and-components.md)
- [Turbo Streams](turbo-streams.md)
- [Data and models](data-and-models.md)
- [Coffee and build](coffee-and-build.md)

## Package entry points

- `superdry` — router, `createComponent`, Turbo `res.stream`, optional Preact helpers
- `superdry/html` — HTML theme implementation (used by `createTheme` on the main package)
- `superdry/model` — Drizzle sqlite re-exports
- `superdry/coffee-build` — CoffeeScript compile + Bun bundle

The root [README.md](../README.md) has philosophy, stack, and quick start.
