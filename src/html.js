const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const HTML_THEME_MARKER = Symbol.for("superdry.htmlTheme");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isRawNode = (value) => isPlainObject(value) && value.__rawHtml !== undefined;
const makeRaw = (html) => ({
  __rawHtml: String(html),
  toString() {
    return String(this.__rawHtml);
  },
});

const flattenClassTokens = (value, out = []) => {
  if (value === null || value === undefined || value === false) return out;
  if (Array.isArray(value)) {
    for (const item of value) flattenClassTokens(item, out);
    return out;
  }
  const tokens = String(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  out.push(...tokens);
  return out;
};

const normalizeClassName = (value, themeClasses) => {
  const tokens = flattenClassTokens(value);
  return tokens.map((token) => themeClasses[token] ?? token).join(" ");
};

/** Maps React-style / camelCase props to real HTML attribute names when simple camel→kebab would be wrong. */
const CAMEL_CASE_ATTR_ALIASES = {
  allowFullScreen: "allowfullscreen",
  autoCapitalize: "autocapitalize",
  autoComplete: "autocomplete",
  autoCorrect: "autocorrect",
  autoFocus: "autofocus",
  autoPlay: "autoplay",
  contentEditable: "contenteditable",
  crossOrigin: "crossorigin",
  dateTime: "datetime",
  enterKeyHint: "enterkeyhint",
  formNoValidate: "formnovalidate",
  htmlFor: "for",
  inputMode: "inputmode",
  maxLength: "maxlength",
  minLength: "minlength",
  noValidate: "novalidate",
  readOnly: "readonly",
  spellCheck: "spellcheck",
  srcSet: "srcset",
};

/**
 * Theme props may use camelCase (`dataElemLoading`); serialized HTML uses kebab-case data / hyphen rules.
 * @param {string} key
 * @returns {string}
 */
export const propKeyToHtmlAttr = (key) => {
  if (Object.hasOwn(CAMEL_CASE_ATTR_ALIASES, key)) {
    return CAMEL_CASE_ATTR_ALIASES[key];
  }
  if (!/[A-Z]/.test(key)) return key;
  return key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
};

export const createHtmlTheme = (themeDef = {}) => {
  const themeClasses = themeDef.classes ?? {};
  const callbackCapture = [];

  const renderNode = (node) => {
    if (node === null || node === undefined || node === false) return "";
    if (Array.isArray(node)) return node.map((item) => renderNode(item)).join("");
    if (typeof node === "function") {
      callbackCapture.push([]);
      const result = node();
      const captured = callbackCapture.pop().join("");
      // Prefer captured sibling tag output from callback-style children.
      // This preserves all emitted nodes when CoffeeScript returns the last expression.
      if (captured) return captured;
      if (result === undefined || result === null) return "";
      return renderNode(result);
    }
    if (isRawNode(node)) return String(node.__rawHtml);
    return escapeHtml(node);
  };

  const renderTag = (tagName, ...args) => {
    let props = {};
    let children = args;
    if (args.length > 0 && isPlainObject(args[0]) && !isRawNode(args[0])) {
      props = args[0];
      children = args.slice(1);
    }

    if (tagName === "form" && typeof props.method === "string") {
      const requestedMethod = props.method.toUpperCase();
      if (!["GET", "POST", "DIALOG"].includes(requestedMethod)) {
        props = { ...props, method: "post" };
        children = [
          makeRaw(
            `<input type="hidden" name="_method" value="${escapeHtml(requestedMethod)}">`
          ),
          ...children,
        ];
      }
    }

    const attrs = [];
    const classSource = props.className ?? props.class;
    if (classSource !== undefined && classSource !== null && classSource !== false) {
      const resolvedClass = normalizeClassName(classSource, themeClasses);
      if (resolvedClass) attrs.push(`class="${escapeHtml(resolvedClass)}"`);
    }

    for (const [key, value] of Object.entries(props)) {
      if (key === "class" || key === "className") continue;
      if (value === null || value === undefined || value === false) continue;
      const attrName = propKeyToHtmlAttr(key);
      if (value === true) {
        attrs.push(attrName);
      } else {
        attrs.push(`${attrName}="${escapeHtml(value)}"`);
      }
    }

    const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    const childHtml = children.map((child) => renderNode(child)).join("");
    const html = VOID_TAGS.has(tagName)
      ? `<${tagName}${attrString}>`
      : `<${tagName}${attrString}>${childHtml}</${tagName}>`;

    if (callbackCapture.length > 0) {
      callbackCapture[callbackCapture.length - 1].push(html);
    }
    return makeRaw(html);
  };

  /**
   * One `<script type="module">` with `import` lines for each URL. URLs may be passed
   * as separate args or a single array; null/undefined/empty strings are skipped.
   * @param {...string|string[]} urls
   */
  const importScript = (...urls) => {
    const list = urls
      .flatMap((u) => (Array.isArray(u) ? u : [u]))
      .filter((u) => u != null && String(u).trim() !== "");
    if (list.length === 0) return makeRaw("");
    const body = list.map((u) => `import ${JSON.stringify(String(u).trim())};`).join("\n");
    return renderTag("script", { type: "module" }, makeRaw(body));
  };

  const htmlTheme = new Proxy(
    {
      ...themeDef,
      raw: (html) => makeRaw(html),
      importScript,
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => renderTag(String(prop), ...args);
      },
    }
  );
  Object.defineProperty(htmlTheme, HTML_THEME_MARKER, {
    value: true,
    enumerable: false,
  });
  return htmlTheme;
};

export const isHtmlTheme = (value) =>
  Boolean(value && typeof value === "object" && value[HTML_THEME_MARKER] === true);

export const ensureHtmlTheme = (value = {}) =>
  isHtmlTheme(value) ? value : createHtmlTheme(value);

// Preferred generic naming: a theme is always HTML-capable.
export const createTheme = createHtmlTheme;
export const isTheme = isHtmlTheme;
export const ensureTheme = ensureHtmlTheme;

export { escapeHtml };
