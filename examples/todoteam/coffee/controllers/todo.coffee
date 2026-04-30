import {
  normalizeFilter
  countActiveTodos
  createTodo
  toggleTodoCompleted
  deleteTodoById
} from '../models/todo'
import { createRoute } from 'superdry'
import { todoForm, todoRow, activeCountText } from '../themes'

export todoRoute = createRoute (r) ->
  r.post '/', (app, req, res) ->
    text = String(req.formData.get('text') ? '').trim()
    filter = normalizeFilter String(req.query.filter ? app.state.filter)

    unless text
      return res.stream
        .replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

    insertedTodo = await createTodo(app.db, text)
    activeCount = await countActiveTodos(app.db)

    stream = res.stream
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }
      .replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

    if filter isnt 'completed' and insertedTodo
      stream.prepend 'todo-list', todoRow app.state, app.state.theme, { todo: insertedTodo, filter }
    else
      stream

  r.patch '/:id/toggle', (app, req, res) ->
    filter = normalizeFilter String(req.query.filter ? app.state.filter)
    { updated } = await toggleTodoCompleted(app.db, req.params.id)
    activeCount = await countActiveTodos(app.db)
    isVisible =
      filter is 'all' or
      (filter is 'active' and !updated?.completed) or
      (filter is 'completed' and updated?.completed)

    stream = res.stream
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

    if isVisible
      stream.replace "todo-#{req.params.id}", todoRow app.state, app.state.theme, { todo: updated, filter }
    else
      stream.remove "todo-#{req.params.id}"

  r.delete '/:id', (app, req, res) ->
    await deleteTodoById(app.db, req.params.id)
    activeCount = await countActiveTodos(app.db)

    res.stream
      .remove "todo-#{req.params.id}"
      .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }