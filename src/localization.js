export const DEFAULT_LANG = 'en';

export const MODEL_VALIDATION_MESSAGES = {
  en: {
    type: '${field} should be a ${type}',
    notNull: '${field} is required',
    maxLength: '${field} should be less than ${maxLength} chars',
    format: '${field} is invalid',
  },
  zh: {
    type: '${field}应该是${type}类型',
    notNull: '${field}不能为空',
    maxLength: '${field}应该少于${maxLength}个字符',
    format: '${field}格式不正确',
  },
};

const splitArguments = (source = '') => {
  const args = [];
  let current = '';
  let quote = '';

  for (const char of String(source)) {
    if (quote) {
      if (char === quote) quote = '';
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) args.push(current.trim());
  return args;
};

const parseArgument = (source, values) => {
  const value = String(source ?? '').trim();
  const quoted = value.match(/^(['"])(.*)\1$/);
  if (quoted) return quoted[2];
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return values?.[value] ?? '';
};

const pluralize = (count, singular, plural) => {
  const number = Number(count);
  if (number === 1) return `${number} ${singular}`;
  return `${number} ${plural ?? `${singular}s`}`;
};

const TEMPLATE_HELPERS = {
  pluralize,
};

const evaluateExpression = (expression, values) => {
  const normalized = String(expression ?? '').trim();
  const helperMatch = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
  if (!helperMatch) return values?.[normalized] ?? '';

  const helper = TEMPLATE_HELPERS[helperMatch[1]];
  if (!helper) return values?.[normalized] ?? '';

  const args = splitArguments(helperMatch[2]).map((arg) => parseArgument(arg, values));
  return helper(...args);
};

export const formatMessage = (template, values = {}) =>
  String(template ?? '').replace(/\$\{([^}]+)\}/g, (_, expression) =>
    evaluateExpression(expression, values)
  );

export const pluralMessage = (count, forms = {}, fallbackForms = {}, values = {}) => {
  const selectedForms = forms ?? {};
  const fallback = fallbackForms ?? {};
  const key = Number(count) === 1 ? 'one' : 'other';
  const template =
    selectedForms[key] ??
    selectedForms.other ??
    fallback[key] ??
    fallback.other ??
    '';
  return formatMessage(template, { ...values, count });
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isPluralForms = (value) =>
  isPlainObject(value) && ('one' in value || 'other' in value);

const isTemplate = (value) =>
  typeof value === 'string' && /\$\{[^}]+\}/.test(value);

const labelSource = (locale = {}) => locale?.labels ?? locale ?? {};

export const createLocale = (locales = {}, options = {}) => {
  const defaultLang = options.defaultLang ?? Object.keys(locales)[0] ?? DEFAULT_LANG;
  const defaultLocale = locales[defaultLang] ?? {};

  return (lang = defaultLang) => {
    const selectedLang = lang && locales[lang] ? lang : defaultLang;
    return {
      lang: selectedLang,
      locale: locales[selectedLang] ?? defaultLocale,
      defaultLocale,
      locales,
    };
  };
};

export const labelsFor = (locale = {}, fallbackLocale = {}) => {
  const current = labelSource(locale);
  const fallback = labelSource(fallbackLocale);
  const keys = new Set([...Object.keys(fallback), ...Object.keys(current)]);
  const labels = {};

  for (const key of keys) {
    const value = current[key];
    const fallbackValue = fallback[key];

    if (isPluralForms(value) || isPluralForms(fallbackValue)) {
      labels[key] = (count, values = {}) => pluralMessage(count, value, fallbackValue, values);
    } else if (isPlainObject(value) || isPlainObject(fallbackValue)) {
      labels[key] = labelsFor(value, fallbackValue);
    } else if (isTemplate(value) || isTemplate(fallbackValue)) {
      const template = value ?? fallbackValue;
      labels[key] = (countOrValues, values = {}) => {
        const templateValues = isPlainObject(countOrValues)
          ? countOrValues
          : { ...values, count: countOrValues };
        return formatMessage(template, templateValues);
      };
    } else {
      labels[key] = value ?? fallbackValue;
    }
  }

  return labels;
};

export const frameworkLocaleFor = (lang = DEFAULT_LANG) => {
  const selectedLang = lang && MODEL_VALIDATION_MESSAGES[lang] ? lang : DEFAULT_LANG;
  return {
    model: {
      validations: MODEL_VALIDATION_MESSAGES[selectedLang],
    },
  };
};
