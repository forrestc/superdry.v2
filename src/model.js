import { eq as drizzleEq } from 'drizzle-orm';
import { integer, sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';
import {
  MODEL_VALIDATION_MESSAGES,
  formatMessage,
  frameworkLocaleFor,
} from './localization.js';

export { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export { count } from 'drizzle-orm';

const TYPE_BUILDER_SYMBOL = Symbol('superdryTypeBuilder');
const MODEL_TABLE_SYMBOL = Symbol('superdryModelTable');
const MODEL_COLUMN_SYMBOL = Symbol('superdryModelColumn');
const DB_WRAPPED_SYMBOL = Symbol('superdryModelDbWrapped');

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let globalValidationMessages = { ...MODEL_VALIDATION_MESSAGES.en };

export class ModelValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ModelValidationError';
    this.status = 400;
    this.details = details;
  }
}

export const configureModelMessages = (messages = {}) => {
  const source = messages ?? {};
  const validations = source.model?.validations ?? source.validations ?? source;
  globalValidationMessages = {
    ...globalValidationMessages,
    ...(validations ?? {}),
  };
};

const renderMessage = (messages, rule, context) => {
  const template = messages?.[rule] ?? MODEL_VALIDATION_MESSAGES.en[rule] ?? MODEL_VALIDATION_MESSAGES.en.format;
  return formatMessage(template, context);
};

const buildColumnByType = (kind, fieldName, options = {}) => {
  if (kind === 'integer') return integer(fieldName, options);
  if (kind === 'text') return sqliteText(fieldName, options);
  if (kind === 'boolean') return integer(fieldName, { ...options, mode: 'boolean' });
  if (kind === 'uuid') return sqliteText(fieldName, options);
  throw new Error(`Unsupported type "${kind}" for field "${fieldName}"`);
};

const normalizeFormatValidator = (formatRule) => {
  if (formatRule === EMAIL_FORMAT) {
    return (value) => value === undefined || value === null || EMAIL_FORMAT.test(String(value));
  }
  if (formatRule instanceof RegExp) {
    return (value) => value === undefined || value === null || formatRule.test(String(value));
  }
  if (typeof formatRule === 'function') {
    return (value, record) => {
      const result = formatRule(value, record);
      if (typeof result === 'object' && result !== null) return result.valid !== false;
      return Boolean(result);
    };
  }
  if (typeof formatRule === 'string') {
    return (value) => value === undefined || value === null || String(value).includes(formatRule);
  }
  return () => true;
};

const isTypeBuilder = (value) => Boolean(value?.[TYPE_BUILDER_SYMBOL]);

const typeName = (kind) => {
  if (kind === 'integer') return 'integer';
  if (kind === 'text') return 'text';
  if (kind === 'boolean') return 'boolean';
  return kind;
};

const coerceBoolean = (value) => {
  if (typeof value === 'boolean') return { value, valid: true };
  if (typeof value === 'number') return { value: value !== 0, valid: value === 0 || value === 1 };
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'on', 'yes'].includes(normalized)) return { value: true, valid: true };
  if (['false', '0', 'off', 'no'].includes(normalized)) return { value: false, valid: true };
  return { value, valid: false };
};

const coerceValue = (field, value) => {
  if (value === undefined || value === null) return { value, valid: true };
  if (field.kind === 'text' || field.kind === 'uuid') return { value: String(value), valid: true };
  if (field.kind === 'boolean') return coerceBoolean(value);
  if (field.kind === 'integer') {
    const number = Number(value);
    return { value: number, valid: Number.isInteger(number) };
  }
  return { value, valid: true };
};

const getMessages = (table, overrideMessages) => ({
  ...globalValidationMessages,
  ...(table?.[MODEL_TABLE_SYMBOL]?.messages ?? {}),
  ...(overrideMessages ?? {}),
});

const createValidationError = (table, errors, overrideMessages) => {
  const messages = getMessages(table, overrideMessages);
  const details = errors.map((error) => ({
    ...error,
    message: renderMessage(messages, error.rule, error),
  }));
  return new ModelValidationError(details[0]?.message ?? 'Invalid model', details);
};

const normalizeRecord = (table, record = {}, { partial = false, messages, validate = true } = {}) => {
  const meta = table?.[MODEL_TABLE_SYMBOL];
  if (!meta) return record;
  const input = record ?? {};

  const normalized = {};
  const errors = [];

  for (const [fieldName, field] of Object.entries(meta.fields)) {
    const hasValue = Object.prototype.hasOwnProperty.call(input, fieldName);
    if (!hasValue && partial) continue;

    let value = hasValue ? input[fieldName] : field.defaultValue;
    if (value === undefined && field.hasDefault) continue;

    if (value === undefined || value === null) {
      if (field.notNull && (hasValue || !partial)) {
        errors.push({ rule: 'notNull', field: fieldName, type: typeName(field.kind) });
      }
      if (hasValue) normalized[fieldName] = value;
      continue;
    }

    const coerced = coerceValue(field, value);
    if (!coerced.valid) {
      errors.push({ rule: 'type', field: fieldName, type: typeName(field.kind) });
      normalized[fieldName] = value;
      continue;
    }
    value = coerced.value;

    if (field.maxLength !== undefined && String(value).length > field.maxLength) {
      errors.push({
        rule: 'maxLength',
        field: fieldName,
        type: typeName(field.kind),
        maxLength: field.maxLength,
      });
    }

    for (const validator of field.validators) {
      if (!validator.test(value, input)) {
        errors.push({
          rule: validator.rule,
          field: fieldName,
          type: typeName(field.kind),
          ...(validator.context ?? {}),
        });
      }
    }

    normalized[fieldName] = value;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (!(fieldName in meta.fields)) normalized[fieldName] = value;
  }

  if (validate && errors.length > 0) throw createValidationError(table, errors, messages);
  return normalized;
};

export const validateRecord = (table, record = {}, options = {}) =>
  normalizeRecord(table, record, options);

export const coerceFieldValue = (column, value, options = {}) => {
  const field = column?.[MODEL_COLUMN_SYMBOL];
  if (!field) return value;
  const coerced = coerceValue(field, value);
  if (!coerced.valid) {
    const table = field.table;
    throw createValidationError(
      table,
      [{ rule: 'type', field: field.name, type: typeName(field.kind) }],
      options.messages,
    );
  }
  return coerced.value;
};

export const type = (kind, options = {}) => {
  const operations = [];
  const validators = [];
  const meta = {
    kind,
    maxLength: undefined,
    notNull: false,
    hasDefault: false,
    defaultValue: undefined,
  };

  const builderTarget = {
    [TYPE_BUILDER_SYMBOL]: true,
    build(fieldName) {
      let column = buildColumnByType(kind, fieldName, options);
      for (const operation of operations) {
        column = column[operation.method](...operation.args);
      }
      return {
        column,
        meta: {
          ...meta,
          name: fieldName,
          validators: [...validators],
        },
      };
    },
  };

  let builderProxy;
  builderProxy = new Proxy(builderTarget, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'maxLength') {
        return (maxLength) => {
          meta.maxLength = Number(maxLength);
          return builderProxy;
        };
      }
      if (prop === 'format') {
        return (formatRule, context) => {
          validators.push({
            rule: 'format',
            test: normalizeFormatValidator(formatRule),
            context,
          });
          return builderProxy;
        };
      }
      return (...args) => {
        if (prop === 'notNull') meta.notNull = true;
        if (prop === 'default') {
          meta.hasDefault = true;
          meta.defaultValue = args[0];
        }
        operations.push({ method: prop, args });
        return builderProxy;
      };
    },
  });
  return builderProxy;
};

export const createModel = (definition = {}) => {
  const tableName = definition.table;
  const fields = definition.fields ?? {};
  const messages = definition.messages?.validations ?? definition.messages;

  if (!tableName || typeof tableName !== 'string') {
    throw new Error('createModel requires a string "table" name');
  }

  const columnDefinitions = {};
  const fieldMeta = {};

  for (const [fieldName, fieldDefinition] of Object.entries(fields)) {
    if (!isTypeBuilder(fieldDefinition)) {
      throw new Error(`Field "${fieldName}" must be created with type(...)`);
    }
    const built = fieldDefinition.build(fieldName);
    columnDefinitions[fieldName] = built.column;
    fieldMeta[fieldName] = built.meta;
  }

  const table = sqliteTable(tableName, columnDefinitions);
  const tableMeta = { fields: fieldMeta, messages };
  table[MODEL_TABLE_SYMBOL] = tableMeta;

  for (const [fieldName, field] of Object.entries(fieldMeta)) {
    field.table = table;
    table[fieldName][MODEL_COLUMN_SYMBOL] = field;
  }

  return class ModelRecord {
    static table = table;

    static validate(record, options = {}) {
      return normalizeRecord(table, record, options);
    }

    constructor(values = {}) {
      Object.assign(this, normalizeRecord(table, values, { validate: false }));
    }

    validate(options = {}) {
      return normalizeRecord(table, this, options);
    }
  };
};

const validateOneMutationValue = (table, value, options) => {
  if (value && typeof value.validate === 'function') return value.validate(options);
  return normalizeRecord(table, value, options);
};

const validateMutationValues = (table, values, options) => {
  if (Array.isArray(values)) {
    return values.map((value) => validateOneMutationValue(table, value, options));
  }
  return validateOneMutationValue(table, values, options);
};

const wrapInsertBuilder = (builder, table, messages) => {
  if (!table?.[MODEL_TABLE_SYMBOL]) return builder;
  const originalValues = builder.values.bind(builder);
  builder.values = (values) =>
    originalValues(validateMutationValues(table, values, { messages }));
  return builder;
};

const wrapUpdateBuilder = (builder, table, messages) => {
  if (!table?.[MODEL_TABLE_SYMBOL]) return builder;
  const originalSet = builder.set.bind(builder);
  builder.set = (values) =>
    originalSet(validateMutationValues(table, values, { partial: true, messages }));
  return builder;
};

const resolveWrapperMessages = (options = {}, context = {}) => {
  const modelMessages = typeof options.model === 'function'
    ? options.model(context)
    : options.model;
  const messages = typeof options.messages === 'function'
    ? options.messages(context)
    : options.messages;
  const frameworkMessages = frameworkLocaleFor(context.state?.lang ?? context.query?.lang)
    .model
    .validations;

  return modelMessages?.validations ??
    options.lang?.model?.validations ??
    messages?.model?.validations ??
    messages?.validations ??
    messages ??
    frameworkMessages;
};

export const wrapModelDb = (db, options = {}, context = {}) => {
  if (!db || db[DB_WRAPPED_SYMBOL]) return db;

  const messages = resolveWrapperMessages(options, context);
  const originalInsert = db.insert.bind(db);
  const originalUpdate = db.update.bind(db);
  const originalWith = db.with?.bind(db);

  db.insert = (table) => wrapInsertBuilder(originalInsert(table), table, messages);
  db.update = (table) => wrapUpdateBuilder(originalUpdate(table), table, messages);
  db.eq = (left, right) => drizzleEq(left, coerceFieldValue(left, right, { messages }));

  if (originalWith) {
    db.with = (...queries) => {
      const scoped = originalWith(...queries);
      scoped.insert = (table) => wrapInsertBuilder(scoped.insert(table), table, messages);
      scoped.update = (table) => wrapUpdateBuilder(scoped.update(table), table, messages);
      scoped.eq = db.eq;
      return scoped;
    };
  }

  db[DB_WRAPPED_SYMBOL] = true;
  return db;
};
