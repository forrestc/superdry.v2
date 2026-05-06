import { createModel, type, count } from 'superdry/model'
import { broadcast } from 'superdry'

FILTERS = new Set ['all', 'active', 'completed']

export Todo = createModel table: 'todos', fields:
  id: type('integer').primaryKey autoIncrement: true
  text: type('text').maxLength(24).notNull()
  completed: type('boolean').notNull().default(false)

export todosTable = Todo.table

export normalizeFilter = (filter) ->
  if FILTERS.has(filter) then filter else 'all'

export listTodos = (db) ->
  db.select().from(todosTable).orderBy(db.desc(todosTable.id))

export countActiveTodos = (db) ->
  [result] = await db
    .select({ count: count(todosTable.id) })
    .from(todosTable)
    .where(db.eq(todosTable.completed, false))
  Number(result?.count ? 0)

export createTodo = (db, text) ->
  todo = new Todo { text, completed: false }
  [insertedTodo] = await db.insert(todosTable).values(todo).returning()
  broadcast 'create', insertedTodo
  insertedTodo

export findTodoById = (db, id) ->
  [todo] = await db.select().from(todosTable).where(db.eq(todosTable.id, id)).limit(1)
  todo

export setTodoCompleted = (db, id, completed) ->
  [updatedTodo] = await db
    .update(todosTable)
    .set(completed: Boolean(completed))
    .where(db.eq(todosTable.id, id))
    .returning()
  updatedTodo

export toggleTodoCompleted = (db, id) ->
  current = await findTodoById(db, id)
  return null unless current
  updated = await setTodoCompleted(db, id, !current.completed)
  broadcast 'toggle', updated
  { current, updated }

export deleteTodoById = (db, id) ->
  deleted = { id }
  await db.delete(todosTable).where(db.eq(todosTable.id, id))
  broadcast 'delete', deleted
  deleted
