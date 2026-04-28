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
    text = String(req.form.get('text') ? '').trim()
    filter = normalizeFilter String(req.query.filter ? app.state.filter)

    unless text
      return res.stream (stream) ->
        stream.replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

    insertedTodo = await createTodo(app.db, text)
    activeCount = await countActiveTodos(app.db)

    res.stream (stream) ->
      stream
        .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }
        .replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

      if filter isnt 'completed' and insertedTodo
        stream.prepend 'todo-list', todoRow app.state, app.state.theme, { todo: insertedTodo, filter }

  r.patch '/:id/toggle', (app, req, res) ->
    filter = normalizeFilter String(req.query.filter ? app.state.filter)
    id = Number(req.params.id)

    result = await toggleTodoCompleted(app.db, id)
    return res.redirect("/?filter=#{filter}") unless result?.updated

    { updated } = result
    activeCount = await countActiveTodos(app.db)
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

  r.delete '/:id', (app, req, res) ->
    id = Number(req.params.id)

    await deleteTodoById(app.db, id)
    activeCount = await countActiveTodos(app.db)

    res.stream (stream) ->
      stream
        .remove "todo-#{id}"
        .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }
