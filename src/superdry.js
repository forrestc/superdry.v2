import { h as preactH } from 'preact';
import { signal } from '@preact/signals';
import { TurboStream } from 'node-turbo';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, sql } from 'drizzle-orm';
import { integer, sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { ensureTheme } from './html.js';
export {
  ensureTheme,
  isTheme,
  createTheme as createHtmlTheme,
  ensureTheme as ensureHtmlTheme,
} from './html.js';

const TYPE_BUILDER_SYMBOL = Symbol('superdryTypeBuilder');

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildColumnByType = (kind, fieldName, options = {}) => {
  if (kind === 'integer') return integer(fieldName, options);
  if (kind === 'text') return sqliteText(fieldName, options);
  if (kind === 'boolean') return integer(fieldName, { ...options, mode: 'boolean' });
  if (kind === 'uuid') return sqliteText(fieldName, options);
  throw new Error(`Unsupported type "${kind}" for field "${fieldName}"`);
};

const isTypeBuilder = (value) => Boolean(value?.[TYPE_BUILDER_SYMBOL]);

const normalizeFormatValidator = (formatRule) => {
  if (formatRule === EMAIL_FORMAT) {
    return {
      test: (value) => value === undefined || value === null || EMAIL_FORMAT.test(String(value)),
      error: 'format is not email',
    };
  }

  if (formatRule instanceof RegExp) {
    return {
      test: (value) => value === undefined || value === null || formatRule.test(String(value)),
      error: `format must match ${formatRule}`,
    };
  }

  if (typeof formatRule === 'function') {
    return {
      test: (value, record) => {
        const result = formatRule(value, record);
        if (typeof result === 'object' && result !== null) {
          return result.valid !== false;
        }
        return Boolean(result);
      },
      error: 'format is invalid',
    };
  }

  if (typeof formatRule === 'string') {
    return {
      test: (value) => value === undefined || value === null || String(value).includes(formatRule),
      error: `format must include "${formatRule}"`,
    };
  }

  return {
    test: () => true,
    error: 'format is invalid',
  };
};

export const type = (kind, options = {}) => {
  const operations = [];
  const validators = [];
  let required = false;

  const builderTarget = {
    [TYPE_BUILDER_SYMBOL]: true,
    getRequired() {
      return required;
    },
    build(fieldName) {
      let column = buildColumnByType(kind, fieldName, options);
      for (const operation of operations) {
        column = column[operation.method](...operation.args);
      }
      return { column, validators };
    },
  };

  let builderProxy;
  builderProxy = new Proxy(builderTarget, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'format') {
        return (formatRule) => {
          validators.push(normalizeFormatValidator(formatRule));
          return builderProxy;
        };
      }
      return (...args) => {
        if (prop === 'notNull') required = true;
        operations.push({ method: prop, args });
        return builderProxy;
      };
    },
  });
  return builderProxy;
};

export const createModel = (definition = {}) => {
  const tableName = definition.table;
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('createModel requires a string "table" name');
  }

  const columnDefinitions = {};
  const validatorsByField = {};

  for (const [fieldName, fieldDefinition] of Object.entries(definition)) {
    if (fieldName === 'table') continue;
    if (!isTypeBuilder(fieldDefinition)) {
      throw new Error(`Field "${fieldName}" must be created with type(...)`);
    }
    const { column, validators } = fieldDefinition.build(fieldName);
    columnDefinitions[fieldName] = column;
    validatorsByField[fieldName] = validators;
  }

  const table = sqliteTable(tableName, columnDefinitions);

  const validate = (record = {}) => {
    const errors = [];

    for (const [fieldName, fieldDefinition] of Object.entries(definition)) {
      if (fieldName === 'table') continue;
      const value = record[fieldName];

      if ((value === undefined || value === null) && fieldDefinition.getRequired?.()) {
        errors.push({ field: fieldName, error: 'required' });
      }

      const validators = validatorsByField[fieldName] ?? [];
      for (const validator of validators) {
        if (!validator.test(value, record)) {
          errors.push({ field: fieldName, error: validator.error });
        }
      }
    }

    return { validated: errors.length === 0, errors };
  };

  return {
    table,
    validate,
    ...table,
  };
};

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
    return ensureTheme(baseOrTheme ?? {});
  }
  return ensureTheme(mergeTheme(baseOrTheme ?? {}, overrideTheme ?? {}));
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
    return renderFn(props.state, ensureTheme(props.theme), props.data, props.ctx);
  }
  return renderFn(stateOrProps, ensureTheme(theme), data, ctx);
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

const FORM_METHOD_OVERRIDES = new Set(['PUT', 'PATCH', 'DELETE']);

const resolveRequestMethod = async (request, getFormData) => {
  const method = request.method.toUpperCase();
  if (method !== 'POST') return method;

  const headerOverride = request.headers.get('x-http-method-override');
  if (headerOverride) {
    return headerOverride.toUpperCase();
  }

  try {
    const form = await getFormData();
    const override =
      form.get('_method') ??
      form.get('__method') ??
      form.get('method');
    const overrideMethod = String(override ?? '').toUpperCase();
    if (FORM_METHOD_OVERRIDES.has(overrideMethod)) {
      return overrideMethod;
    }
  } catch {
    // Non-form POST requests can skip method override resolution.
  }

  return method;
};

const isFormLikeContentType = (request) => {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
};

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

const normalizeRoutePrefix = (prefix = '/') => {
  if (!prefix) return '/';
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }
  return normalized;
};

const joinRoutePath = (prefix, path = '/') => {
  const normalizedPrefix = normalizeRoutePrefix(prefix);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === '/') return normalizedPrefix;
  if (normalizedPrefix === '/') return normalizedPath;
  return `${normalizedPrefix}${normalizedPath}`;
};

export const createRoute = (registerFn) => {
  const routes = [];
  const addRoute = (method, path, handler) => {
    routes.push({ method, path, handler });
  };
  const router = {
    get: (path, handler) => addRoute('GET', path, handler),
    post: (path, handler) => addRoute('POST', path, handler),
    put: (path, handler) => addRoute('PUT', path, handler),
    patch: (path, handler) => addRoute('PATCH', path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),
  };
  if (typeof registerFn === 'function') {
    registerFn(router);
  }
  return routes;
};

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
    patch: (path, handler) => registerRoute('PATCH', path, handler),
    delete: (path, handler) => registerRoute('DELETE', path, handler),
    route: (prefix, routes = []) => {
      for (const route of routes) {
        registerRoute(route.method, joinRoutePath(prefix, route.path), route.handler);
      }
      return appInstance;
    },
    async fetch(request, env) {
      const routes = normalizeRoutes(routeDefs);
      const url = new URL(request.url);
      const originalMethod = request.method.toUpperCase();
      let parsedFormData;
      const getFormData = async () => {
        if (!parsedFormData) {
          parsedFormData = await request.formData();
        }
        return parsedFormData;
      };
      const method = await resolveRequestMethod(request, getFormData);
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
      const selectedTheme = themeName ? ensureTheme(themes[themeName]) : undefined;
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

      const req = {
        ...baseReq,
        app,
        formData: undefined,
        readFormData: getFormData,
      };

      if (originalMethod === 'POST' && isFormLikeContentType(request)) {
        try {
          req.formData = await getFormData();
        } catch {
          req.formData = undefined;
        }
      }

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
