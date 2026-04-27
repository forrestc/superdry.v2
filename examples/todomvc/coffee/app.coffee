import { newApp } from 'superdry'
import { todos } from './schema'
import { page, themes, todoForm, todoRow, activeCountText } from './theme'

FILTERS = new Set ['all', 'active', 'completed']
normalizeFilter = (filter) -> if FILTERS.has(filter) then filter else 'all'

DEFAULT_THEME_BY_HOUR = (hour = new Date().getHours()) ->
  if hour >= 7 and hour < 19 then 'light' else 'dark'

fetchTodos = (app) ->
  db = app.db
  if app.state.filter is 'active'
    return db.select().from(todos).where(db.eq(todos.completed, false)).orderBy(db.desc(todos.id))
  if app.state.filter is 'completed'
    return db.select().from(todos).where(db.eq(todos.completed, true)).orderBy(db.desc(todos.id))
  db.select().from(todos).orderBy(db.desc(todos.id))

fetchActiveCount = (app) ->
  db = app.db
  rows = await db.select({ id: todos.id }).from(todos).where(db.eq(todos.completed, false))
  rows.length

addTodo = (app, req, res) ->
  form = await req.formData()
  text = String(form.get('text') ? '').trim()
  filter = normalizeFilter String(form.get('filter') ? app.state.filter)

  unless text
    return res.stream (stream) ->
      stream.replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

  db = app.db
  [insertedTodo] = await db.insert(todos).values({ text, completed: false }).returning()
  activeCount = await fetchActiveCount(app)

  res.stream (stream) ->
    stream
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }
      .replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

    if filter isnt 'completed' and insertedTodo
      stream.prepend 'todo-list', todoRow app.state, app.state.theme, { todo: insertedTodo, filter }

toggleTodo = (app, req, res) ->
  form = await req.formData()
  filter = normalizeFilter String(form.get('filter') ? app.state.filter)
  id = Number(req.params.id)
  db = app.db

  [current] = await db.select().from(todos).where(db.eq(todos.id, id)).limit(1)
  return res.redirect("/?filter=#{filter}") unless current

  [updated] = await db
    .update(todos)
    .set(completed: !current.completed)
    .where(db.eq(todos.id, id))
    .returning()

  activeCount = await fetchActiveCount(app)
  isVisible =
    filter is 'all' or
    (filter is 'active' and !updated.completed) or
    (filter is 'completed' and updated.completed)

  res.stream (stream) ->
    if isVisible
      stream.replace "todo-#{id}", todoRow app.state, app.state.theme, { todo: updated, filter }
    else
      stream.remove "todo-#{id}"

    stream.update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

deleteTodo = (app, req, res) ->
  form = await req.formData()
  filter = normalizeFilter String(form.get('filter') ? app.state.filter)
  id = Number(req.params.id)
  db = app.db

  await db.delete(todos).where(db.eq(todos.id, id))
  activeCount = await fetchActiveCount(app)

  res.stream (stream) ->
    stream
      .remove "todo-#{id}"
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

app = newApp
  themes: themes
  getDefaultThemeName: ->
    DEFAULT_THEME_BY_HOUR()
  parseState: ({ url, theme, themeName }) ->
    filter: normalizeFilter(url.searchParams.get('filter') ? 'all')
    theme: theme
    themeName: themeName
  loadPageData: (app) ->
    [todoItems, activeCount] = await Promise.all [fetchTodos(app), fetchActiveCount(app)]
    todos: todoItems
    activeCount: activeCount
  renderPage: ({ app, data }) ->
    page app.state, app.state.theme, data

app.post '/todos', addTodo
app.post '/todos/:id/toggle', toggleTodo
app.post '/todos/:id/delete', deleteTodo

export default app
