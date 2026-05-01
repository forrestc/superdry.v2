# HTML themes and components

TodoMVC builds **HTML strings** with **`createTheme`** (backed by [`superdry/html`](../src/html.js)): each tag name on `theme` is a function. **`createComponent`** wraps a render function that receives **`(state, theme, data)`** and returns HTML.

Full sources: [`examples/todomvc/coffee/themes/index.coffee`](../examples/todomvc/coffee/themes/index.coffee), [`examples/todomvc/coffee/themes/components.coffee`](../examples/todomvc/coffee/themes/components.coffee).

---

## 1. Theme: class aliases and extra fields

You define a **`classes`** map from **short names** (used in `className`) to real Tailwind strings. Anything else on the object (CDN URLs, and so on) is just data your layout reads.

```coffee
# examples/todomvc/coffee/themes/index.coffee (abbreviated)
export theme = createTheme
  tailwindScript: 'https://cdn.tailwindcss.com'
  turboScript: 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.23/+esm'
  classes:
    row: 'flex items-center gap-3 border-b border-gray-100 px-4 py-3'
    checkbox: 'w-7 h-7 rounded-full border ...'
    # ...full list in the repo file
```

In a component, `className: 'row'` becomes the expanded `row` value from `classes`. Arrays work too: `className: ['label', condition and 'labelDone']`.

---

## 2. One component: `todoRow`

A row is a **`createComponent`** that only needs **`theme`** and **`data`** (state is unused, hence `_state`). It outputs one **`<li>`** with a **stable `id`**: the Turbo controller will replace this node by id after toggle.

```coffee
# examples/todomvc/coffee/themes/components.coffee
export todoRow = createComponent (_state, theme, data) ->
  actionQuery = "?filter=#{encodeURIComponent(data.filter)}"
  theme.li { className: 'row', id: "todo-#{data.todo.id}" }, ->
    theme.form { method: 'patch', action: "/todos/#{data.todo.id}/toggle#{actionQuery}" }, ->
      theme.button { className: 'checkbox', type: 'submit' }, (if data.todo.completed then '✓' else '')

    theme.span { className: (if data.todo.completed then 'label labelDone' else 'label') }, data.todo.text

    theme.form { method: 'delete', action: "/todos/#{data.todo.id}#{actionQuery}" }, ->
      theme.button { className: 'deleteBtn', type: 'submit' }, '×'
```

**Details:**

- **`theme.form { method: 'patch' }`** — the HTML theme emits **`method="post"`** plus a hidden **`_method`** field so the Worker can treat the request as **`PATCH`** (same idea for **`delete`**).
- **`data`** carries **`todo`** and **`filter`** so links include the current filter query string.

---

## 3. A parent component: `todoList` calls `todoRow`

The list component maps **`data.items`** and invokes **`todoRow`** with the same **`state`**, **`theme`**, and a small **`data`** bundle per item.

```coffee
# examples/todomvc/coffee/themes/components.coffee
export todoList = createComponent (state, theme, data) ->
  theme.ul { className: 'list', id: 'todo-list' }, ->
    data.items.map (todo) ->
      todoRow state, theme, { todo, filter: data.filter }
```

The **`<ul id="todo-list">`** is another Turbo target: new todos can be **`prepend`**-ed here (see [Turbo Streams](turbo-streams.md)).

---

## 4. Page shell: `layout` composes form, list, footer

The layout stitches fragments together. Only the **head** snippet is shown here; the important part is that **`todoList`** and **`todoForm`** are called like ordinary functions with **`state`**, **`theme`**, and **`data`**.

```coffee
# examples/todomvc/coffee/themes/components.coffee (excerpt)
export layout = createComponent (state, theme, data) ->
  '<!doctype html>' +
    theme.html { lang: 'en' }, ->
      theme.head ->
        theme.script { src: theme.tailwindScript }
        theme.script { type: 'module' }, theme.raw("""import "#{theme.turboScript}";""")
      theme.body { className: 'body' }, ->
        theme.main { className: 'container' }, ->
          theme.section { className: 'card' }, ->
            todoForm state, theme, { filter: state.filter }
            todoList state, theme, { items: data.todos, filter: state.filter }
            todoFooter state, theme, { activeCount: data.activeCount, filter: state.filter }
```

**`theme.raw(...)`** is for trusted HTML only (here the Turbo ESM import line).

---

## Preact path (not used in TodoMVC)

`superdry` also exposes **`createThemeProxy`** and **`Store` / `Component`** for Preact + signals. TodoMVC stays on the HTML string path above.
