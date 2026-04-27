import { h as preactH } from 'preact';
import { signal } from '@preact/signals';
import { TurboStream } from 'node-turbo';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, sql } from 'drizzle-orm';
import { createHtmlTheme, ensureHtmlTheme } from './html.js';
export { createHtmlTheme, ensureHtmlTheme } from './html.js';

// --- THEME PROXY ---
export const createThemeProxy = (themeDef) => {
  return new Proxy(themeDef, {
    get: (target, name) => {
      const themeClasses = target[name] || "";
      return (first, ...rest) => {
        let classes = [themeClasses], props = {}, children = rest;
        if (typeof first === 'string' && first.startsWith('.')) {
          classes.push(first.slice(1).replace(/\./g, ' '));
        } else if (typeof first === 'object' && !Array.isArray(first)) {
          props = first;
        } else {
          children = [first, ...rest];
        }
        const tag = target[`${name}_tag`] || (['button', 'input', 'img', 'h1', 'ul', 'li', 'span'].includes(name) ? name : 'div');
        return preactH(tag, { ...props, className: classes.join(' ').trim() }, children);
      };
    }
  });
};

// Runtime themes should stay as plain data (strings, tokens, config).
// The proxy-based API remains available via createThemeProxy/Component.
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const mergeTheme = (base = {}, override = {}) => {
  const merged = { ...base, ...override };
  if (isPlainObject(base.classes) || isPlainObject(override.classes)) {
    merged.classes = { ...(base.classes ?? {}), ...(override.classes ?? {}) };
  }
  return merged;
};

export const createTheme = (baseOrTheme, overrideTheme) => {
  if (overrideTheme === undefined) {
    return baseOrTheme ?? {};
  }
  return mergeTheme(baseOrTheme ?? {}, overrideTheme ?? {});
};

export const createComponent = (renderFn) => (...args) => {
  const [stateOrProps, theme, data, ctx] = args;
  // Backward-compatible: supports both
  // 1) component(state, theme, data, ctx)
  // 2) component({ state, theme, data, ctx })
  if (
    args.length === 1 &&
    stateOrProps &&
    typeof stateOrProps === 'object' &&
    ('state' in stateOrProps || 'theme' in stateOrProps || 'data' in stateOrProps || 'ctx' in stateOrProps)
  ) {
    const props = stateOrProps;
    return renderFn(props.state, ensureHtmlTheme(props.theme), props.data, props.ctx);
  }
  return renderFn(stateOrProps, ensureHtmlTheme(theme), data, ctx);
};

export const h = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const redirectResponse = (path = '/') =>
  new Response(null, {
    status: 303,
    headers: { Location: path },
  });

const isTurboRequest = (request) =>
  (request.headers.get('accept') ?? '').includes('text/vnd.turbo-stream.html');

const turboStreamResponse = (stream) =>
  new Response(stream.render(), {
    headers: { 'content-type': 'text/vnd.turbo-stream.html; charset=utf-8' },
  });

const compilePathPattern = (pathPattern) => {
  const names = [];
  const escaped = pathPattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${escaped}$`), names };
};

const matchPath = (compiled, pathname) => {
  const match = pathname.match(compiled.regex);
  if (!match) return null;
  const params = {};
  compiled.names.forEach((name, idx) => {
    params[name] = decodeURIComponent(match[idx + 1]);
  });
  return params;
};

const normalizeRoutes = (routes = []) =>
  routes.map((route) => ({
    ...route,
    method: (route.method ?? 'GET').toUpperCase(),
    _compiled: compilePathPattern(route.path),
  }));

export const newApp = (config) => {
  const routeDefs = [...(config.routes ?? [])];
  const registerRoute = (method, path, handler) => {
    routeDefs.push({ method, path, handler });
    return appInstance;
  };

  const appInstance = {
    get: (path, handler) => registerRoute('GET', path, handler),
    post: (path, handler) => registerRoute('POST', path, handler),
    put: (path, handler) => registerRoute('PUT', path, handler),
    delete: (path, handler) => registerRoute('DELETE', path, handler),
    async fetch(request, env) {
      const routes = normalizeRoutes(routeDefs);
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const pathname = url.pathname;
      const query = Object.fromEntries(url.searchParams.entries());
      const themes = config.themes ?? {};
      const getDefaultThemeName = config.getDefaultThemeName;
      const fallbackThemeName =
        (typeof getDefaultThemeName === 'function'
          ? await getDefaultThemeName({ request, env, url, query })
          : config.defaultTheme) ??
        Object.keys(themes)[0];
      const requestedThemeName = query.theme;
      const themeName = (requestedThemeName && themes[requestedThemeName])
        ? requestedThemeName
        : fallbackThemeName;
      const selectedTheme = themeName ? ensureHtmlTheme(themes[themeName]) : undefined;
      const state = config.parseState
        ? await config.parseState({
          request,
          env,
          url,
          query,
          theme: selectedTheme,
          themeName,
          themes,
        })
        : {};
      const db =
        (config.getOrm
          ? await config.getOrm({ request, env, url, state })
          : drizzle(env.DB));
      db.desc = desc;
      db.eq = eq;
      db.sql = sql;
      const app = {
        env,
        db,
        state,
        themes,
      };
      if (state.theme === undefined && selectedTheme !== undefined) {
        state.theme = selectedTheme;
      }
      if (state.themeName === undefined && themeName !== undefined) {
        state.themeName = themeName;
      }
      const baseReq = {
        raw: request,
        method,
        url,
        query,
        params: {},
        isTurbo: isTurboRequest(request),
        theme: selectedTheme,
        themeName,
      };

      let parsedFormData;
      const req = {
        ...baseReq,
        app,
        formData: async () => {
          if (!parsedFormData) {
            parsedFormData = await request.formData();
          }
          return parsedFormData;
        },
      };

      let stream;
      const res = {
        redirect: (path) => redirectResponse(path),
        stream: (mutator) => {
          if (!stream) {
            stream = new TurboStream();
          }
          if (typeof mutator === 'function') {
            mutator(stream);
          }
          return turboStreamResponse(stream);
        },
        notFound: () => new Response('Not Found', { status: 404 }),
      };

      for (const route of routes) {
        if (route.method !== method) continue;
        const params = matchPath(route._compiled, pathname);
        if (!params) continue;
        req.params = params;
        return route.handler(app, req, res);
      }

      if (method === 'GET' && pathname === '/') {
        const loadPage = config.loadPageData ?? config.loadPageDate;
        const pageData = loadPage
          ? await loadPage(app, req, res)
          : {};
        const html = await config.renderPage({ app, req, res, data: pageData });
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      return res.notFound();
    },
  };
  return appInstance;
};

// --- BASE STORE & COMPONENT ---
export class Store {
  constructor(db) { this.db = db; this.signals = {}; }
  prop(key, initial) {
    this.signals[key] = signal(initial);
    Object.defineProperty(this, key, {
      get: () => this.signals[key].value,
      set: (v) => this.signals[key].value = v
    });
  }
}

export class Component {
  constructor(store, theme) {
    this.store = store;
    this.theme = createThemeProxy(theme);
  }
}
