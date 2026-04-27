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

    const attrs = [];
    const classSource = props.className ?? props.class;
    if (classSource !== undefined && classSource !== null && classSource !== false) {
      const resolvedClass = normalizeClassName(classSource, themeClasses);
      if (resolvedClass) attrs.push(`class="${escapeHtml(resolvedClass)}"`);
    }

    for (const [key, value] of Object.entries(props)) {
      if (key === "class" || key === "className") continue;
      if (value === null || value === undefined || value === false) continue;
      if (value === true) {
        attrs.push(key);
      } else {
        attrs.push(`${key}="${escapeHtml(value)}"`);
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

  const htmlTheme = new Proxy(
    {
      ...themeDef,
      raw: (html) => makeRaw(html),
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

export { escapeHtml };
