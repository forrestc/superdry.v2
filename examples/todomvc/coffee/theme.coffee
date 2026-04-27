import { createComponent, createTheme } from 'superdry'

export light = createTheme
  tailwindScript: 'https://cdn.tailwindcss.com'
  turboScript: 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.23/+esm'
  classes:
    body: 'm-0 bg-gray-100'
    container: 'max-w-[620px] mx-auto mt-10 px-4'
    heading: 'text-center text-[52px] sm:text-[72px] font-thin text-red-900/25 mb-4'
    card: 'bg-white rounded-lg shadow-[0_6px_20px_rgba(0,0,0,0.08)] overflow-hidden'
    form: 'flex border-b border-gray-200'
    formInput: 'w-full border-none px-5 py-[18px] text-[22px] italic outline-none'
    list: 'list-none m-0 p-0'
    row: 'flex items-center gap-3 border-b border-gray-100 px-4 py-3'
    checkbox: 'w-7 h-7 rounded-full border border-slate-300 bg-white cursor-pointer text-emerald-500 font-bold'
    label: 'flex-1 text-[18px] sm:text-[20px] text-gray-900'
    labelDone: 'text-slate-400 line-through'
    deleteBtn: 'border-none bg-transparent text-red-400 text-[28px] leading-none cursor-pointer'
    footer: 'flex justify-between items-center px-4 py-3 text-sm text-gray-500'
    filters: 'flex gap-2'
    filterLink: 'no-underline text-inherit px-2 py-1'
    filterLinkActive: 'border rounded border-red-900/35'

export dark = createTheme light,
  classes:
    body: 'm-0 bg-slate-950 text-slate-100'
    card: 'bg-slate-900 rounded-lg shadow-[0_6px_20px_rgba(0,0,0,0.45)] overflow-hidden'
    form: 'flex border-b border-slate-700'
    formInput: 'w-full border-none px-5 py-[18px] text-[22px] italic outline-none bg-transparent text-slate-100'
    row: 'flex items-center gap-3 border-b border-slate-800 px-4 py-3'
    checkbox: 'w-7 h-7 rounded-full border border-slate-500 bg-transparent cursor-pointer text-emerald-400 font-bold'
    label: 'flex-1 text-[18px] sm:text-[20px] text-slate-100'
    labelDone: 'text-slate-500 line-through'
    footer: 'flex justify-between items-center px-4 py-3 text-sm text-slate-400'
    filterLink: 'no-underline text-inherit px-2 py-1'
    filterLinkActive: 'border rounded border-emerald-500/50'

export themes = { light, dark }

export activeCountText = createComponent (_state, _theme, data) ->
  "#{data.activeCount} item#{if data.activeCount is 1 then '' else 's'} left"

export todoRow = createComponent (_state, theme, data) ->
  themeQuery = if _state.themeName then "?theme=#{encodeURIComponent(_state.themeName)}" else ''
  theme.li { className: 'row', id: "todo-#{data.todo.id}" }, ->
    theme.form { method: 'post', action: "/todos/#{data.todo.id}/toggle#{themeQuery}" }, ->
      theme.input { type: 'hidden', name: 'filter', value: data.filter }
      theme.button { className: 'checkbox', type: 'submit' }, (if data.todo.completed then '✓' else '')

    theme.span { className: (if data.todo.completed then 'label labelDone' else 'label') }, data.todo.text

    theme.form { method: 'post', action: "/todos/#{data.todo.id}/delete#{themeQuery}" }, ->
      theme.input { type: 'hidden', name: 'filter', value: data.filter }
      theme.button { className: 'deleteBtn', type: 'submit' }, '×'

export todoList = createComponent (state, theme, data) ->
  theme.ul { className: 'list', id: 'todo-list' }, ->
    data.items.map (todo) ->
      todoRow state, theme, { todo, filter: data.filter }

export todoForm = createComponent (_state, theme, data) ->
  themeQuery = if _state.themeName then "?theme=#{encodeURIComponent(_state.themeName)}" else ''
  theme.form { className: 'form', id: 'new-todo-form', method: 'post', action: "/todos#{themeQuery}" }, ->
    theme.input { type: 'hidden', name: 'filter', value: data.filter }
    theme.input
      className: 'formInput'
      id: 'new-todo-input'
      name: 'text'
      placeholder: 'What needs to be done?'
      required: true

export todoFooter = createComponent (state, theme, data) ->
  themeQuery = if state.themeName then "&theme=#{encodeURIComponent(state.themeName)}" else ''
  theme.footer { className: 'footer', id: 'todo-footer' }, ->
    theme.span { id: 'active-count' }, activeCountText state, theme, { activeCount: data.activeCount }

    theme.nav { className: 'filters' }, ->
      theme.a { className: ['filterLink', data.filter is 'all' and 'filterLinkActive'], href: "/?filter=all#{themeQuery}" }, 'All'
      theme.a { className: ['filterLink', data.filter is 'active' and 'filterLinkActive'], href: "/?filter=active#{themeQuery}" }, 'Active'
      theme.a { className: ['filterLink', data.filter is 'completed' and 'filterLinkActive'], href: "/?filter=completed#{themeQuery}" }, 'Completed'

export page = createComponent (state, theme, data) ->
  '<!doctype html>' +
    theme.html { lang: 'en' }, ->
      theme.head ->
        theme.meta { charset: 'utf-8' }
        theme.meta { name: 'viewport', content: 'width=device-width, initial-scale=1' }
        theme.title 'Superdry TodoMVC'
        theme.script { src: theme.tailwindScript }
        theme.script { type: 'module' }, theme.raw("""import "#{theme.turboScript}";""")

      theme.body { className: 'body' }, ->
        theme.main { className: 'container' }, ->
          theme.h1 { className: 'heading' }, 'todos'
          theme.section { className: 'card' }, ->
            todoForm state, theme, { filter: state.filter }
            todoList state, theme, { items: data.todos, filter: state.filter }
            todoFooter state, theme, { activeCount: data.activeCount, filter: state.filter }
