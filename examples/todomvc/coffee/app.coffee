import { newApp } from 'superdry'
import { todoRoute } from './controllers/todo'
import { listTodos, countActiveTodos, normalizeFilter } from './models/todo'
import { layout, themes } from './themes'

DEFAULT_THEME_BY_HOUR = (hour = new Date().getHours()) ->
  if hour >= 7 and hour < 19 then 'light' else 'dark'

app = newApp
  themes: themes
  getDefaultThemeName: ->
    DEFAULT_THEME_BY_HOUR()
  parseState: ({ url }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
  loadPageData: (app) ->
    [todoItems, activeCount] = await Promise.all [listTodos(app.db, app.state.filter), countActiveTodos(app.db)]
    todos: todoItems
    activeCount: activeCount
  renderPage: ({ app, data }) ->
    layout app.state, app.state.theme, data

app.route '/todos', todoRoute

export default app
