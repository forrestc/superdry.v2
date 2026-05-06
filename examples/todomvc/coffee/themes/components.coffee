import { createComponent, queryFor } from 'superdry/controller'

export activeCountText = createComponent (_state, theme, data) ->
  theme.labels.itemsLeft data.activeCount

export todoRow = createComponent (state, theme, data) ->
  actionQuery = queryFor filter: data.filter, lang: state.lang
  isHidden =
    (data.filter is 'active' and data.todo.completed) or
    (data.filter is 'completed' and !data.todo.completed)
  theme.li { className: ['row', isHidden and 'hidden'], id: "todo-#{data.todo.id}" }, ->
    theme.form { dataElemLoading: '..', method: 'patch', action: "/todos/#{data.todo.id}/toggle#{actionQuery}" }, ->
      theme.button { className: 'checkbox', type: 'submit' }, (if data.todo.completed then '✓' else '')

    theme.span { className: (if data.todo.completed then 'label labelDone' else 'label') }, data.todo.text

    theme.form { dataElemLoading: '..', method: 'delete', action: "/todos/#{data.todo.id}#{actionQuery}" }, ->
      theme.button { className: 'deleteBtn', type: 'submit' }, '×'

export todoList = createComponent (state, theme, data) ->
  theme.ul { className: 'list', id: 'todo-list' }, ->
    data.items.map (todo) ->
      todoRow state, theme, { todo, filter: data.filter }

export todoForm = createComponent (state, theme, data) ->
  actionQuery = queryFor filter: data.filter, lang: state.lang
  theme.form { className: 'form', id: 'new-todo-form', method: 'post', action: "/todos#{actionQuery}" }, ->
    theme.input
      className: 'formInput'
      id: 'new-todo-input'
      name: 'text'
      placeholder: theme.labels.newTodoPlaceholder
      required: true

export todoFooter = createComponent (state, theme, data) ->
  linkQuery = (filter) ->
    queryFor filter: filter, lang: (if state.lang is 'en' then null else state.lang)
  { all, active, completed } = theme.labels.filters
  theme.footer { className: 'footer', id: 'todo-footer' }, ->
    theme.span { id: 'active-count' }, activeCountText state, theme, { activeCount: data.activeCount }

    theme.nav { className: 'filters' }, ->
      theme.a { className: ['filterLink', data.filter is 'all' and 'filterLinkActive'], href: "/#{linkQuery('all')}" }, all
      theme.a { className: ['filterLink', data.filter is 'active' and 'filterLinkActive'], href: "/#{linkQuery('active')}" }, active
      theme.a { className: ['filterLink', data.filter is 'completed' and 'filterLinkActive'], href: "/#{linkQuery('completed')}" }, completed

export main = createComponent (state, theme, data) ->
  theme.main { className: 'container' }, ->
    theme.h1 { className: 'heading' }, 'todos'
    theme.section { className: 'card' }, ->
      todoForm state, theme, { filter: state.filter }
      todoList state, theme, { items: data.todos, filter: state.filter }
      todoFooter state, theme, { activeCount: data.activeCount, filter: state.filter }
    theme.div { className: 'error', dataSuperdryErrors: true, hidden: true }