import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export todos = sqliteTable 'todos',
  id: integer('id').primaryKey autoIncrement: true
  text: text('text').notNull()
  completed: integer('completed', mode: 'boolean').notNull().default(false)
