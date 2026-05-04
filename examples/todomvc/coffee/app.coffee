import { newApp } from 'superdry'
import { todoRoute, renderTodoCreate, renderTodoToggle, renderTodoDelete } from './controllers/todo'
import { listTodos, countActiveTodos, normalizeFilter } from './models/todo'
import { layout, theme, main } from './themes'

app = newApp
  serveSuperdryClient: true
  broadcasts:
    create: renderTodoCreate
    toggle: renderTodoToggle
    delete: renderTodoDelete
  parseState: ({ url }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
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