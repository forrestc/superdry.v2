# Broadcast

Broadcast lets one browser window react to a mutation made in another window. A model or handler queues a small event, and each receiving tab asks the server to render that event using its own current URL state.

## TodoMVC events

[`createTodo`](../examples/todomvc/coffee/models/todo.coffee), [`toggleTodoCompleted`](../examples/todomvc/coffee/models/todo.coffee), and [`deleteTodoById`](../examples/todomvc/coffee/models/todo.coffee) queue broadcasts after the database mutation:

```coffee
import { broadcast } from 'superdry'

export createTodo = (db, text) ->
  [insertedTodo] = await db.insert(todos).values({ text, completed: false }).returning()
  broadcast 'create', insertedTodo
  insertedTodo

export toggleTodoCompleted = (db, id) ->
  # ...
  broadcast 'toggle', updated
  { current, updated }

export deleteTodoById = (db, id) ->
  deleted = { id: Number(id) }
  await db.delete(todos).where(db.eq(todos.id, Number(id)))
  broadcast 'delete', deleted
  deleted
```

The route and broadcast sync handler share one renderer, so the app does not duplicate row markup or filter rules:

```coffee
export renderTodoCreate = (app, res, created) ->
  # update count, then prepend todoRow

export renderTodoToggle = (app, res, updated) ->
  filter = normalizeFilter String(app.state.filter)
  activeCount = await countActiveTodos(app.db)
  # update count, then replace todo-#{updated.id}; todoRow hides itself for this filter

export renderTodoDelete = (app, res, deleted) ->
  # update count, then remove todo-#{deleted.id}
```

Register that renderer on `newApp`:

```coffee
app = newApp
  serveSuperdryClient: true
  broadcasts:
    create: renderTodoCreate
    toggle: renderTodoToggle
    delete: renderTodoDelete
```

The submitting routes still call the same helpers after mutating. Filtered pages keep every row in the DOM and let `todoRow` apply `hidden`, so a receiving tab can update `todo-#{id}` without querying or replacing the whole list.

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
