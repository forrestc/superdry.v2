import { createComponent } from 'superdry'

export activeCountText = createComponent (_state, _theme, data) ->
  "#{data.activeCount} item#{if data.activeCount is 1 then '' else 's'} left"

export todoRow = createComponent (_state, theme, data) ->
  actionQuery = "?filter=#{encodeURIComponent(data.filter)}"
  theme.li { className: 'row', id: "todo-#{data.todo.id}" }, ->
    theme.form { dataElemLoading: '..', method: 'patch', action: "/todos/#{data.todo.id}/toggle#{actionQuery}" }, ->
      theme.button { className: 'checkbox', type: 'submit' }, (if data.todo.completed then '✓' else '')

    theme.span { className: (if data.todo.completed then 'label labelDone' else 'label') }, data.todo.text

    theme.form { dataElemLoading: '..', method: 'delete', action: "/todos/#{data.todo.id}#{actionQuery}" }, ->
      theme.button { className: 'deleteBtn', type: 'submit' }, '×'

export todoList = createComponent (state, theme, data) ->
  theme.ul { className: 'list', id: 'todo-list' }, ->
    data.items.map (todo) ->
      todoRow state, theme, { todo, filter: data.filter }

export todoForm = createComponent (_state, theme, data) ->
  actionQuery = "?filter=#{encodeURIComponent(data.filter)}"
  theme.form { className: 'form', id: 'new-todo-form', method: 'post', action: "/todos#{actionQuery}" }, ->
    theme.input
      className: 'formInput'
      id: 'new-todo-input'
      name: 'text'
      placeholder: 'What needs to be done?'
      required: true

export todoFooter = createComponent (state, theme, data) ->
  theme.footer { className: 'footer', id: 'todo-footer' }, ->
    theme.span { id: 'active-count' }, activeCountText state, theme, { activeCount: data.activeCount }

    theme.nav { className: 'filters' }, ->
      theme.a { className: ['filterLink', data.filter is 'all' and 'filterLinkActive'], href: '/?filter=all' }, 'All'
      theme.a { className: ['filterLink', data.filter is 'active' and 'filterLinkActive'], href: '/?filter=active' }, 'Active'
      theme.a { className: ['filterLink', data.filter is 'completed' and 'filterLinkActive'], href: '/?filter=completed' }, 'Completed'

export main = createComponent (state, theme, data) ->
  theme.main { className: 'container' }, ->
    theme.h1 { className: 'heading' }, 'todos'
    theme.section { className: 'card' }, ->
      todoForm state, theme, { filter: state.filter }
      todoList state, theme, { items: data.todos, filter: state.filter }
      todoFooter state, theme, { activeCount: data.activeCount, filter: state.filter }