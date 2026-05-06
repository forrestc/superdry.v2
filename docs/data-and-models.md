# Data and models

Handlers use **`app.db`** (Drizzle on D1). TodoMVC keeps the **table definition** and **query helpers** in one module. Full file: [`examples/todomvc/coffee/models/todo.coffee`](../examples/todomvc/coffee/models/todo.coffee).

---

## Model definition

Imports come from **`superdry/model`**. `createModel` keeps the Drizzle table and validation rules in one place.

```coffee
# examples/todomvc/coffee/models/todo.coffee (excerpt)
import { createModel, type, count } from 'superdry/model'

export Todo = createModel table: 'todos', fields:
  id: type('integer').primaryKey autoIncrement: true
  text: type('text').maxLength(24).notNull()
  completed: type('boolean').notNull().default(false)

export todosTable = Todo.table
```

---

## Using `app.db` in a query

**`db.eq`**, **`db.desc`**, etc. are attached by the framework. Model tables also validate mutation values and coerce typed predicate values.

```coffee
# examples/todomvc/coffee/models/todo.coffee (excerpt)
export createTodo = (db, text) ->
  todo = new Todo { text, completed: false }
  [insertedTodo] = await db.insert(todosTable).values(todo).returning()
  insertedTodo

export findTodoById = (db, id) ->
  [todo] = await db.select().from(todosTable).where(db.eq(todosTable.id, id)).limit(1)
  todo
```

`db.insert(todosTable).values(...)` and `db.update(todosTable).set(...)` validate model fields. `db.eq(todosTable.id, id)` coerces `id` with `Number()` and throws a 400 validation error if it is not an integer.

---

## Validation messages

Validation messages can be supplied with app config:

```coffee
# langs/zh.coffee
export default
  model:
    validations:
      type: '${field}应该是${type}类型'
      maxLength: '${field}应该少于${maxLength}个字符'
```

```coffee
app = newApp
  model: zh.model
```

The placeholders come from the failed rule, such as `field`, `type`, and `maxLength`.
