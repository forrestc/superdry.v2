# Localization

Superdry localization stays server-first: pick a language from the request, store it in `app.state`, and let framework helpers read that state. UI flows should keep using forms, Turbo Streams, HTML fragments, and plain text errors rather than JSON.

---

## Locale file

Framework-owned validation messages are built into Superdry for supported languages. App-specific words stay in app locale files under the conventional `locales/` folder. TodoMVC marks English as the default by prefixing the file name with `_`:

```coffee
# examples/todomvc/coffee/locales/_en.coffee
export default
  labels:
    title: 'todos'
    filters:
      all: 'All'
      active: 'Active'
      completed: 'Completed'
    itemsLeft: '${pluralize count, "item"} left'
```

Chinese UI copy lives in `locales/zh.coffee`:

```coffee
# examples/todomvc/coffee/locales/zh.coffee
export default
  labels:
    title: '待办事项'
    filters:
      all: '全部'
      active: '进行中'
      completed: '已完成'
    itemsLeft: '剩余${count}项'
```

Both framework and app messages use the same `${...}` placeholder syntax. During the Coffee build, Superdry discovers `coffee/locales/*.coffee`, strips the default marker from `_en.coffee`, and registers the locale as `en`.

---

## Select by `?lang=zh`

`parseState` runs before `app.db` is wrapped. Superdry uses `state.lang` to choose framework validation messages, while `state.locale` feeds UI copy. When the Coffee build finds a `locales/` folder, `newApp` automatically merges locale state from `?lang=...`; app state returned from `parseState` still wins when it sets `lang`, `locale`, `defaultLocale`, or `locales` explicitly.

```coffee
# examples/todomvc/coffee/app.coffee
import { newApp } from 'superdry'

app = newApp
  parseState: ({ url }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    theme: theme
```

Now `/todos?lang=zh` uses Chinese model validation messages from the framework and Chinese UI labels from the example locale file. TodoMVC also preserves `lang` in form actions and filter links so mutation requests continue using the selected language.

---

## UI messages

`createComponent` populates `theme.labels` from `state.locale` and falls back to `state.defaultLocale`. Plain strings stay strings. Template strings become functions, so labels can accept data:

```coffee
import { createComponent, queryFor } from 'superdry/controller'

export activeCountText = createComponent (_state, theme, data) ->
  theme.labels.itemsLeft data.activeCount

export todoFooter = createComponent (state, theme, data) ->
  { all, active, completed } = theme.labels.filters
  theme.a { href: "/#{queryFor(filter: 'all')}" }, all
```

Templates can call small framework helpers. `pluralize` includes the count and pluralizes the noun:

```coffee
itemsLeft: '${pluralize count, "item"} left'
peopleLeft: '${pluralize count, "person", "people"} left'
```

---

## Error display

When a model validation fails, Superdry returns a **4xx plain-text** response. If there are multiple validation errors, each message is returned on its own line. `superdry-client` renders those lines as a list inside the page’s `data-superdry-errors` element.
