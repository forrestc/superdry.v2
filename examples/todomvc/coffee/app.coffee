import { newApp } from 'superdry'
import { addTodo, toggleTodo, deleteTodo } from './controllers/todo'
import { listTodos, countActiveTodos, normalizeFilter } from './models/todo'
import { layout, themes } from './themes'

DEFAULT_THEME_BY_HOUR = (hour = new Date().getHours()) ->
  if hour >= 7 and hour < 19 then 'light' else 'dark'

app = newApp
  themes: themes
  getDefaultThemeName: ->
    DEFAULT_THEME_BY_HOUR()
  parseState: ({ url, theme, themeName }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    theme: theme
    themeName: themeName
  loadPageData: (app) ->
    [todoItems, activeCount] = await Promise.all [listTodos(app.db, app.state.filter), countActiveTodos(app.db)]
    todos: todoItems
    activeCount: activeCount
  renderPage: ({ app, data }) ->
    layout app.state, app.state.theme, data

app.post '/todos', addTodo
app.post '/todos/:id/toggle', toggleTodo
app.post '/todos/:id/delete', deleteTodo

export default app
