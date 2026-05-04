import { integer, sqliteTable, text, count } from 'superdry/model'
import { broadcast } from 'superdry'

FILTERS = new Set ['all', 'active', 'completed']

export todos = sqliteTable 'todos',
  id: integer('id').primaryKey autoIncrement: true
  text: text('text').notNull()
  completed: integer('completed', mode: 'boolean').notNull().default(false)

export normalizeFilter = (filter) ->
  if FILTERS.has(filter) then filter else 'all'

export listTodos = (db) ->
  db.select().from(todos).orderBy(db.desc(todos.id))

export countActiveTodos = (db) ->
  [result] = await db
    .select({ count: count(todos.id) })
    .from(todos)
    .where(db.eq(todos.completed, false))
  Number(result?.count ? 0)

export createTodo = (db, text) ->
  [insertedTodo] = await db.insert(todos).values({ text, completed: false }).returning()
  insertedTodo

export findTodoById = (db, id) ->
  [todo] = await db.select().from(todos).where(db.eq(todos.id, Number(id))).limit(1)
  todo

export setTodoCompleted = (db, id, completed) ->
  [updatedTodo] = await db
    .update(todos)
    .set(completed: Boolean(completed))
    .where(db.eq(todos.id, Number(id)))
    .returning()
  updatedTodo

export toggleTodoCompleted = (db, id) ->
  current = await findTodoById(db, id)
  return null unless current
  updated = await setTodoCompleted(db, id, !current.completed)
  broadcast 'toggle', updated
  { current, updated }

export deleteTodoById = (db, id) ->
  await db.delete(todos).where(db.eq(todos.id, Number(id)))
