# Localization

Superdry localization stays server-first: pick a language from the request, store it in `app.state`, and let framework helpers read that state. UI flows should keep using forms, Turbo Streams, HTML fragments, and plain text errors rather than JSON.

---

## Locale file

Framework-owned validation messages are built into Superdry for supported languages. App-specific words stay in app locale files. TodoMVC keeps English fallback copy in `langs/en.coffee`:

```coffee
# examples/todomvc/coffee/langs/en.coffee
export default
  labels:
    filters:
      all: 'All'
      active: 'Active'
      completed: 'Completed'
    itemsLeft: '${pluralize count, "item"} left'
```

Chinese UI copy lives in `langs/zh.coffee`:

```coffee
# examples/todomvc/coffee/langs/zh.coffee
export default
  labels:
    filters:
      all: '全部'
      active: '进行中'
      completed: '已完成'
    itemsLeft: '剩余${count}项'
```

Both framework and app messages use the same `${...}` placeholder syntax.

---

## Select by `?lang=zh`

`parseState` runs before `app.db` is wrapped. Superdry uses `state.lang` to choose framework validation messages, while TodoMVC stores `state.locale` for UI copy.

```coffee
# examples/todomvc/coffee/app.coffee
import en from './langs/en'
import zh from './langs/zh'

LANGS =
  en: en
  zh: zh

normalizeLang = (lang) ->
  if LANGS[lang]? then lang else 'en'

app = newApp
  parseState: ({ url }) ->
    lang = normalizeLang(url.searchParams.get('lang') ? 'en')
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    lang: lang
    locale: LANGS[lang] ? {}
    defaultLocale: LANGS.en
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
