import { createTheme } from 'superdry'

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

export * from './components'
