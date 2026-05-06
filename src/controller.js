import { ensureTheme } from './html.js';
import { labelsFor } from './localization.js';

export { formatMessage, labelsFor, pluralMessage } from './localization.js';

const HTML_THEME_MARKER = Symbol.for('superdry.htmlTheme');

const localizeTheme = (state, theme) => {
  const baseTheme = ensureTheme(theme);
  const fallbackLocale =
    state?.defaultLocale ??
    state?.locales?.en ??
    baseTheme.defaultLocale ??
    {};
  const labels = labelsFor(state?.locale, fallbackLocale);
  const localizedTheme = Object.assign(Object.create(baseTheme), { labels });
  Object.defineProperty(localizedTheme, HTML_THEME_MARKER, {
    value: true,
    enumerable: false,
  });
  return localizedTheme;
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
    return renderFn(props.state, localizeTheme(props.state, props.theme), props.data, props.ctx);
  }
  return renderFn(stateOrProps, localizeTheme(stateOrProps, theme), data, ctx);
};

export const queryFor = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
};
