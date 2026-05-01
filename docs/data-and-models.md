# Data and models

Handlers use **`app.db`** (Drizzle on D1). TodoMVC keeps the **table definition** and **query helpers** in one module. Full file: [`examples/todomvc/coffee/models/todo.coffee`](../examples/todomvc/coffee/models/todo.coffee).

---

## Table definition

Imports come from **`superdry/model`** (Drizzle re-exports).

```coffee
# examples/todomvc/coffee/models/todo.coffee (excerpt)
import { integer, sqliteTable, text, count } from 'superdry/model'

export todos = sqliteTable 'todos',
  id: integer('id').primaryKey autoIncrement: true
  text: text('text').notNull()
  completed: integer('completed', mode: 'boolean').notNull().default(false)
```

---

## Using `app.db` in a query

**`db.eq`**, **`db.desc`**, etc. are attached by the framework. Example: list by filter.

```coffee
# examples/todomvc/coffee/models/todo.coffee (excerpt)
export listTodos = (db, filter = 'all') ->
  selectedFilter = normalizeFilter(filter)
  if selectedFilter is 'active'
    return db.select().from(todos).where(db.eq(todos.completed, false)).orderBy(db.desc(todos.id))
  if selectedFilter is 'completed'
    return db.select().from(todos).where(db.eq(todos.completed, true)).orderBy(db.desc(todos.id))
  db.select().from(todos).orderBy(db.desc(todos.id))
```

**`toggleTodoCompleted`**, **`createTodo`**, and **`deleteTodoById`** in the same file show **`update`**, **`insert`**, and **`delete`** patterns the controller calls.

---

## Optional: `createModel` / `type()` in `superdry`

TodoMVC does **not** use this. For apps that want a **single definition** for both Drizzle columns and **`validate(record)`**, the main package exposes **`createModel`** and **`type('text').notNull().format(...)`**. Use that when validation rules should stay next to the schema; otherwise **`sqliteTable`** as above is enough.
