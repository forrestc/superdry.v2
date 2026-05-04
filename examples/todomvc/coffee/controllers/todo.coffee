import {
  normalizeFilter, countActiveTodos, createTodo
  toggleTodoCompleted, deleteTodoById
} from '../models/todo'
import { createRoute } from 'superdry'
import { todoForm, todoRow, activeCountText } from '../themes'

export renderTodoCreate = (app, res, created) ->
  filter = normalizeFilter String(app.state.filter)
  activeCount = await countActiveTodos(app.db)

  res.stream
    .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

  if created
    res.stream.prepend 'todo-list', todoRow app.state, app.state.theme, { todo: created, filter }

export renderTodoToggle = (app, res, updated) ->
  filter = normalizeFilter String(app.state.filter)
  activeCount = await countActiveTodos(app.db)

  res.stream
    .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

  if updated
    res.stream.replace "todo-#{updated.id}", todoRow app.state, app.state.theme, { todo: updated, filter }

export renderTodoDelete = (app, res, deleted) ->
  activeCount = await countActiveTodos(app.db)

  res.stream
    .remove "todo-#{deleted.id}"
    .update 'active-count', activeCountText app.state, app.state.theme, { activeCount }

export todoRoute = createRoute (r) ->
  r.post '/', (app, req, res) ->
    text = String(req.formData.get('text') ? '').trim()
    filter = normalizeFilter String(req.query.filter ? app.state.filter)

    unless text
      return res.stream
        .replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

    insertedTodo = await createTodo(app.db, text)
    await renderTodoCreate app, res, insertedTodo
    res.stream.replace 'new-todo-form', todoForm app.state, app.state.theme, { filter }

  r.patch '/:id/toggle', (app, req, res) ->
    { updated } = await toggleTodoCompleted(app.db, req.params.id)
    await renderTodoToggle app, res, updated

  r.delete '/:id', (app, req, res) ->
    deleted = await deleteTodoById(app.db, req.params.id)
    await renderTodoDelete app, res, deleted