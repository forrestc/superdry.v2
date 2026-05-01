# App and routing

TodoMVC uses one **`newApp`** for **`GET /`** (full HTML) and **`app.route '/todos', ...`** for mutations. Source: [`examples/todomvc/coffee/app.coffee`](../examples/todomvc/coffee/app.coffee), [`examples/todomvc/coffee/controllers/todo.coffee`](../examples/todomvc/coffee/controllers/todo.coffee).

---

## `parseState` and the HTML theme

`parseState` runs on every request. Its return value becomes **`app.state`**. TodoMVC stores the **filter** and the **theme object** so handlers and components can use **`app.state.theme`**.

```coffee
# examples/todomvc/coffee/app.coffee (excerpt)
app = newApp
  parseState: ({ url }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    theme: theme
```

---

## `GET /`: load data, render layout

Only **`GET /`** triggers **`loadPageData`** then **`renderPage`**. **`renderPage`** receives **`{ app, req, res, data }`**; TodoMVC only needs **`app`** and **`data`**.

```coffee
# examples/todomvc/coffee/app.coffee (excerpt)
  loadPageData: (app) ->
    [todoItems, activeCount] = await Promise.all [
      listTodos(app.db, app.state.filter)
      countActiveTodos(app.db)
    ]
    todos: todoItems
    activeCount: activeCount
  renderPage: ({ app, data }) ->
    layout app.state, app.state.theme, data
```

**`app.db`** is Drizzle on **`env.DB`** by default, with **`db.eq`**, **`db.desc`**, **`db.sql`** attached.

---

## Mount nested routes

```coffee
# examples/todomvc/coffee/app.coffee
app.route '/todos', todoRoute

export default app
```

---

## `createRoute`: path relative to the prefix

Define handlers on **`r`**; paths are **relative to `/todos`**.

```coffee
# examples/todomvc/coffee/controllers/todo.coffee (signature only)
export todoRoute = createRoute (r) ->
  r.post '/', (app, req, res) -> ...
  r.patch '/:id/toggle', (app, req, res) -> ...
  r.delete '/:id', (app, req, res) -> ...
```

So you get **`POST /todos/`**, **`PATCH /todos/:id/toggle`**, **`DELETE /todos/:id`**.

---

## Request and response (quick reference)

| Piece | Role |
|--------|------|
| **`req.params`** | Values for **`:id`** segments |
| **`req.query`** | URL search params (e.g. **`filter`**) |
| **`req.formData`** | Parsed **`FormData`** on **`POST`** with a form-like body |
| **`req.isTurbo`** | `true` when the client accepts Turbo Stream responses |
| **`res.stream`** | Chain **`append` / `prepend` / `replace` / `update` / `remove`**, then **return** it — see [Turbo Streams](turbo-streams.md) |
| **`res.redirect(path)`** | **`303`** with **`Location`** |

**Method override:** **`theme.form { method: 'patch' }`** (or **`delete`**) submits as **`POST`** with **`_method`**; the router promotes that to **`PATCH`** / **`DELETE`**. Details in [HTML themes and components](html-themes-and-components.md).
