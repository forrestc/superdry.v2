# Form UX: no optimistic UI, built-in submit loading

Superdry’s default story is **HTML over the wire** (Turbo Streams), not a JSON API. You *can* build optimistic UIs, but the framework leans the other way: **wait for the server**, keep the client tiny, and avoid state that has to be rolled back.

---

## Why not optimistic UI (for this stack)

1. **Code cost** — You duplicate or shadow server rules in the browser: validation, permissions, “what the row should look like after patch,” and error handling. That fights the “one language, server-first” goal.
2. **User confusion** — If the request fails, the UI must **revert**. Rows flip, counts jump, and toasts pile up unless you invest in careful UX. A short **blocked + loading** state is easier to reason about and matches “the page is the source of truth after the response.”

So the happy path is: **submit → disable inputs → show progress → response → Turbo updates the DOM → re-enable**. No client-side guess about the final HTML.

---

## `superdry-client.js`: one script, no app code

The browser bundle ([`src/superdry-client.js`](../src/superdry-client.js)) listens on **`document`** for Hotwire’s **`turbo:submit-start`** and **`turbo:submit-end`**, so it works for:

- The full page and for **fragments inserted by Turbo Streams** (no rescan, no per-form setup).

On **start** it:

- **Disables** all relevant controls on the submitting form (`input`, `button`, `select`, `textarea` that were enabled).
- Inserts a **thin indeterminate bar** at the top of a **target element** (see below) and gives that element **`position: relative`** if it was `static`.

On **end** it **reverses** those changes (even when the response is an error — Turbo still fires submit-end).

Turbo already sets **`aria-busy`** on the form; superdry-client adds **real blocking** and the visible bar.

---

## Where the bar is anchored: form vs `dataElemLoading`

By default the bar spans the **form**. If the form is visually small (e.g. only a checkbox) but you want the bar across the **whole row**, set **`dataElemLoading`** to an **XPath expression evaluated with the form as the context node** (same as `document.evaluate(expr, form, …)`).

In CoffeeScript you write **`dataElemLoading`** on `theme.form`; the HTML theme emits **`data-elem-loading`** (see [camelCase → kebab-case](html-themes-and-components.md#5-attribute-names-camelcase-in-code-kebab-case-in-html)).

Example: form inside **`li.row`** — parent axis **`..`** picks the row:

```coffee
# examples/todomvc/coffee/themes/components.coffee (abbreviated)
theme.li { className: 'row', id: "todo-#{data.todo.id}" }, ->
  theme.form { dataElemLoading: '..', method: 'patch', action: "..." }, ->
    theme.button { className: 'checkbox', type: 'submit' }, '✓'
```

Other useful expressions (same XPath rules as in the browser):

- **`ancestor::li[1]`** — nearest ancestor `li`
- **`..`** — parent element

Invalid XPath or a non-element result falls back to the **form** and logs a **warning** in the console.

---

## Serving the script from the Worker (no `public/` copy)

Enable **`serveSuperdryClient`** on **`newApp`** so **`GET /superdry-client.js`** (or a custom path) is answered from the embedded package source — no static asset folder required for that file.

The Worker imports **`SUPERDRY_CLIENT_SOURCE`** from **`superdry-client-embedded.js`**, which is **generated** from **`superdry-client.js`** by **`npm run embed-client`** (also runs on **`prepare`** after **`npm install`**). That generated file is **gitignored**; clone/build pipelines should run **`npm install`** at the package root or **`embed-client`** explicitly after editing the browser client.

```coffee
# examples/todomvc/coffee/app.coffee (abbreviated)
app = newApp
  serveSuperdryClient: true
  # ...
```

Point your layout at the same URL as **`theme.clientScript`** (TodoMVC uses **`'/superdry-client.js'`**). The layout loads Turbo and the client with **`theme.importScript`** (see [HTML themes](html-themes-and-components.md#6-importscript-one-module-multiple-imports)).

---

## Mental model

| Piece | Role |
|--------|------|
| **Turbo** | Drives navigation and stream updates; fires submit events |
| **`superdry-client.js`** | Generic submit chrome: disable + bar + restore |
| **`dataElemLoading`** | Optional XPath bar anchor (row vs form) |
| **`serveSuperdryClient`** | Serve the script from the Worker bundle |

Together, this keeps **example app code free** of loading-state boilerplate while staying honest about **server-first** mutations.
