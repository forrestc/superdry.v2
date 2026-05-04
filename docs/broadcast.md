# Broadcast

Broadcast lets one browser window react to a mutation made in another window. A model or handler queues a small event, and each receiving tab asks the server to render that event using its own current URL state.

## TodoMVC toggle

[`toggleTodoCompleted`](../examples/todomvc/coffee/models/todo.coffee) queues the broadcast after the row is updated:

```coffee
import { broadcast } from 'superdry'

export toggleTodoCompleted = (db, id) ->
  current = await findTodoById(db, id)
  return null unless current
  updated = await setTodoCompleted(db, id, !current.completed)
  broadcast 'toggle', updated
  { current, updated }
```

The route and broadcast sync handler share one renderer, so the app does not duplicate row markup or filter rules:

```coffee
export renderTodoToggle = (app, res, updated) ->
  filter = normalizeFilter String(app.state.filter)
  activeCount = await countActiveTodos(app.db)
  # update count, then replace todo-#{updated.id}; todoRow hides itself for this filter
```

Register that renderer on `newApp`:

```coffee
app = newApp
  serveSuperdryClient: true
  broadcasts:
    toggle: renderTodoToggle
```

The submitting route still calls the same helper after mutating. Filtered pages keep every row in the DOM and let `todoRow` apply `hidden`, so a receiving tab can always update `todo-#{id}` without querying or replacing the whole list.

## Browser client

Load `superdry-client.js` with `serveSuperdryClient: true`. The client:

- opens an `EventSource` to `/_superdry/broadcast`,
- tags Turbo form requests with a per-tab client id,
- receives broadcast events and posts them to `/_superdry/broadcast/sync` with the tab's current query string,
- applies the returned Turbo Streams with `Turbo.renderStreamMessage`,
- skips echoing the stream back to the tab that submitted the form.

TodoMVC already loads the client from the layout:

```coffee
theme.importScript theme.turboScript, theme.clientScript
```

## Local and production adapters

By default, Superdry uses an in-memory adapter. That is enough for local development and single-isolate demos.

For Cloudflare production, bind a Durable Object and export the framework Durable Object class from the Worker entry:

```coffee
export { SuperdryBroadcastDurableObject } from 'superdry'
```

```toml
[[durable_objects.bindings]]
name = "SUPERDRY_BROADCAST"
class_name = "SuperdryBroadcastDurableObject"

[[migrations]]
tag = "v1-superdry-broadcast"
new_sqlite_classes = ["SuperdryBroadcastDurableObject"]
```

When `env.SUPERDRY_BROADCAST` exists, `newApp` uses the Durable Object adapter automatically. For custom routing, pass `broadcastAdapter`, `getBroadcastAdapter`, `broadcastChannel`, or `getBroadcastChannel` to `newApp`.
