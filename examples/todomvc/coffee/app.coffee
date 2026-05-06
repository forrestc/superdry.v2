import { newApp } from 'superdry'
import { todoRoute, renderTodoCreate, renderTodoToggle, renderTodoDelete } from './controllers/todo'
import { listTodos, countActiveTodos, normalizeFilter } from './models/todo'
import { layout, theme, main } from './themes'
import en from './langs/en'
import zh from './langs/zh'

LANGS =
  en: en
  zh: zh

normalizeLang = (lang) ->
  if LANGS[lang]? then lang else 'en'

app = newApp
  serveSuperdryClient: true
  broadcasts:
    create: renderTodoCreate
    toggle: renderTodoToggle
    delete: renderTodoDelete
  parseState: ({ url }) ->
    lang = normalizeLang(url.searchParams.get('lang') ? 'en')
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    lang: lang
    locale: LANGS[lang] ? {}
    defaultLocale: LANGS.en
    theme: theme
  loadPageData: (app) ->
    [todoItems, activeCount] = await Promise.all [listTodos(app.db), countActiveTodos(app.db)]
    todos: todoItems
    activeCount: activeCount
  renderPage: ({ app, data }) ->
    layout app.state, app.state.theme, ->
      main app.state, app.state.theme, data

app.route '/todos', todoRoute

export default app