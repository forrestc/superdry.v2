# TodoTeam Example

Fork of TodoMVC using the same minimal `superdry` + CoffeeScript + Workers + D1 setup.

## Requirements

- Bun
- Wrangler CLI (installed via dev dependencies)

## Local Development

```bash
cd examples/todoteam
bun install
bun run db:up
bun run dev
```

Open [http://localhost:8787](http://localhost:8787).

## Useful Commands

- `bun run build:coffee` - build Coffee source into `src/app.js`
- `bun run watch:coffee` - watch Coffee files and rebuild on changes
- `bun run dev` - run Coffee watcher + local Wrangler dev server
- `bun run db:up` - apply local D1 schema from `schema.sql`
- `bun run db:up:remote` - apply schema to remote D1 database
- `bun run deploy` - deploy Worker with Wrangler

## Notes

- Coffee source lives in `coffee/`.
- Generated runtime entrypoint is `src/app.js`.
