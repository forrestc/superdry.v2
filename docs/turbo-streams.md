# Turbo Streams

Mutations return **HTML**, not JSON: the response is **`text/vnd.turbo-stream.html`**, built with **`res.stream`**. The browser runs **Hotwired Turbo** (loaded in `layout`) so those payloads update the DOM by **element id**.

Source: [`examples/todomvc/coffee/controllers/todo.coffee`](../examples/todomvc/coffee/controllers/todo.coffee) (note: file name is **`todo.coffee`**, not `todos`).

---

## Why the same `todoRow` matters

[`todoRow`](html-themes-and-components.md) already renders a row with **`id: "todo-#{data.todo.id}"`**. After a toggle, the server sends **fresh HTML for that row** by calling **`todoRow` again** with the **updated** todo. You do not maintain a second template for “row after toggle.”

---

## Toggle: update count, then replace or remove the row

1. Run the model, read **`updated`** and the current **`filter`**.
2. Decide if the row should still appear under this filter.
3. **`res.stream.update`** the footer count; **`replace`** the **`li`** with a new `todoRow`, or **`remove`** it.

Imports at the top of the controller wire the **same** theme components used on the full page:

```coffee
# examples/todomvc/coffee/controllers/todo.coffee (imports)
import { todoForm, todoRow, activeCountText } from '../themes'
```

The toggle handler:

```coffee
# examples/todomvc/coffee/controllers/todo.coffee
  r.patch '/:id/toggle', (app, req, res) ->
    filter = normalizeFilter String(req.query.filter ? app.state.filter)
    { updated } = await toggleTodoCompleted(app.db, req.params.id)
    activeCount = await countActiveTodos(app.db)
    isVisible =
      filter is 'all' or
      (filter is 'active' and !updated?.completed) or
      (filter is 'completed' and updated?.completed)

    res.stream
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

    if isVisible
      res.stream.replace "todo-#{req.params.id}", todoRow app.state, app.state.theme, { todo: updated, filter }
    else
      res.stream.remove "todo-#{req.params.id}"
```

**Id match:** `replace` targets **`"todo-#{req.params.id}"`**, the same pattern as **`todoRow`**’s **`id: "todo-#{data.todo.id}"`**.

**`activeCountText`** is another small component; **`update 'active-count'`** swaps the footer snippet built like the span inside **`todoFooter`** in [`components.coffee`](../examples/todomvc/coffee/themes/components.coffee) (`id: 'active-count'`).

---

## Other actions (same pattern)

- **Create:** `replace 'new-todo-form', todoForm ...`, optionally `prepend 'todo-list', todoRow ...` for the new item.
- **Delete:** `remove "todo-#{id}"` plus `update 'active-count', ...`.

See the full `r.post` and `r.delete` blocks in the same controller file.

---

## Framework notes

- Return the **`res.stream`** chain from the handler so the router sends the Turbo Stream **`Response`**.
- **`req.isTurbo`** is set when **`Accept`** includes **`text/vnd.turbo-stream.html`**. TodoMVC always streams from these routes; you can branch to **`res.redirect`** for non-Turbo clients if you need a fallback.
