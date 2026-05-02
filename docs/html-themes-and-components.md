# HTML themes and components

TodoMVC builds **HTML strings** with **`createTheme`** (backed by [`superdry/html`](../src/html.js)): each tag name on `theme` is a function. **`createComponent`** wraps a render function that receives **`(state, theme, data)`** and returns HTML.

Full sources: [`examples/todomvc/coffee/themes/index.coffee`](../examples/todomvc/coffee/themes/index.coffee) (theme + **`layout`** shell), [`examples/todomvc/coffee/themes/components.coffee`](../examples/todomvc/coffee/themes/components.coffee) (fragments + **`main`**). The app wires **`main`** into **`layout`** in **`renderPage`** (see [`app.coffee`](../examples/todomvc/coffee/app.coffee)).

For **submit loading** (no optimistic UI) and **`dataElemLoading`**, see [Form UX: submit loading](client-submit-loading.md).

---

## 1. Theme: class aliases and extra fields

You define a **`classes`** map from **short names** (used in `className`) to real Tailwind strings. Anything else on the object (CDN URLs, and so on) is just data your layout reads.

```coffee
# examples/todomvc/coffee/themes/index.coffee (abbreviated)
export theme = createTheme
  tailwindScript: 'https://cdn.tailwindcss.com'
  turboScript: 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.23/+esm'
  clientScript: '/superdry-client.js'
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
    theme.form { dataElemLoading: '..', method: 'patch', action: "/todos/#{data.todo.id}/toggle#{actionQuery}" }, ->
      theme.button { className: 'checkbox', type: 'submit' }, (if data.todo.completed then '✓' else '')

    theme.span { className: (if data.todo.completed then 'label labelDone' else 'label') }, data.todo.text

    theme.form { dataElemLoading: '..', method: 'delete', action: "/todos/#{data.todo.id}#{actionQuery}" }, ->
      theme.button { className: 'deleteBtn', type: 'submit' }, '×'
```

**Details:**

- **`theme.form { method: 'patch' }`** — the HTML theme emits **`method="post"`** plus a hidden **`_method`** field so the Worker can treat the request as **`PATCH`** (same idea for **`delete`**).
- **`data`** carries **`todo`** and **`filter`** so links include the current filter query string.
- **`dataElemLoading: '..'`** — HTML attribute **`data-elem-loading=".."`** (XPath **parent** of the form) so the submit progress bar spans the **`li`**, not only the tiny form. See [client-submit-loading.md](client-submit-loading.md).

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

## 4. Page shell: `layout` + `main`

**`layout`** (in **`index.coffee`**) only builds **`<!doctype>`**, **`head`**, and an otherwise empty **`body`**: the third argument is a **function** that runs to produce inner HTML (passed through **`theme.raw`**). You can still pass **`{ mainHtml: '…' }`** instead of a function if you already have a string.

**`main`** (in **`components.coffee`**) is the page chrome: heading, card, **`todoForm`** / **`todoList`** / **`todoFooter`**.

Wire them in **`renderPage`** so the app decides how the shell and body relate:

```coffee
# examples/todomvc/coffee/app.coffee (excerpt)
import { layout, theme, main } from './themes'

  renderPage: ({ app, data }) ->
    layout app.state, app.state.theme, ->
      main app.state, app.state.theme, data
```

```coffee
# examples/todomvc/coffee/themes/components.coffee (excerpt)
export main = createComponent (state, theme, data) ->
  theme.main { className: 'container' }, ->
    theme.h1 { className: 'heading' }, 'todos'
    theme.section { className: 'card' }, ->
      todoForm state, theme, { filter: state.filter }
      todoList state, theme, { items: data.todos, filter: state.filter }
      todoFooter state, theme, { activeCount: data.activeCount, filter: state.filter }
```

```coffee
# examples/todomvc/coffee/themes/index.coffee (excerpt)
export layout = createComponent (state, theme, bodyOrFn) ->
  inner =
    if typeof bodyOrFn is 'function'
      bodyOrFn()
    else if bodyOrFn?.mainHtml?
      bodyOrFn.mainHtml
    else
      ''
  '<!doctype html>' +
    theme.html { lang: 'en' }, ->
      theme.head -> …
      theme.body { className: 'body' }, ->
        theme.raw(String(inner))
```

(`inner` is the return value of the third argument when it is a function, or **`bodyOrFn.mainHtml`** when you pass an object instead.)

**`theme.importScript`** emits one **`<script type="module">`** whose body is **`import "…";`** lines for each URL (see §6). **`theme.clientScript`** is optional theme data (TodoMVC sets **`'/superdry-client.js'`**); use **`serveSuperdryClient: true`** on **`newApp`** so the Worker serves that path — see [client-submit-loading.md](client-submit-loading.md).

---

## 5. Attribute names: camelCase in code, kebab-case in HTML

The HTML theme ([`src/html.js`](../src/html.js)) serializes props to attributes. Prop keys that contain **capital letters** are turned into **kebab-case** in the generated markup, so CoffeeScript / JS can follow common DOM style without hand-writing hyphenated keys.

| In `theme.div { … }` | Rendered attribute |
|----------------------|---------------------|
| `dataElemLoading: '..'` | `data-elem-loading=".."` |
| `ariaLabel: 'x'` | `aria-label="x"` |
| `strokeWidth: 2` | `stroke-width="2"` |

Keys that are already all lowercase (**`method`**, **`href`**, **`id`**) pass through unchanged.

Some DOM names are **not** hyphenated in real HTML (e.g. **`tabindex`**, **`crossorigin`**). Those use a small built-in alias map so you can still write **`tabIndex`**, **`crossOrigin`**, **`htmlFor`** (→ **`for`**), etc., and get valid attributes. The mapping is exported as **`propKeyToHtmlAttr`** from **`superdry/html`** if you need it outside the theme.

---

## 6. `importScript`: one module, multiple imports

**`theme.importScript a, b, c`** renders a **single** `<script type="module">` whose body is:

```js
import "a";
import "b";
import "c";
```

Each specifier is passed through **`JSON.stringify`** so quoting is safe. **`null`**, **`undefined`**, and empty strings are skipped — handy when **`theme.clientScript`** is optional. You can also pass **one array** of URLs.

---

## Preact path (not used in TodoMVC)

`superdry` also exposes **`createThemeProxy`** and **`Store` / `Component`** for Preact + signals. TodoMVC stays on the HTML string path above.
