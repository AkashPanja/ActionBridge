export interface FieldValidation {
  confidence_min?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min_value?: number;
  max_value?: number;
}

export interface FieldDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "table";
  title: string;
  required: boolean;
  enumValues: string[];
  columns?: FieldDefinition[];
  validations?: FieldValidation;
}

export function fieldsToValidationRules(fields: FieldDefinition[]): Record<string, unknown> {
  const rules: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.key) continue;
    if (!field.validations) continue;
    const r = { ...field.validations } as Record<string, unknown>;
    if (field.type === "table" && field.columns) {
      const colRules: Record<string, unknown> = {};
      for (const col of field.columns) {
        if (col.validations) {
          colRules[col.key] = { ...col.validations };
        }
      }
      if (Object.keys(colRules).length > 0) {
        r.columns = colRules;
      }
    }
    // Remove undefined values so the stored JSON is clean
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (v !== undefined && v !== null && v !== "") {
        cleaned[k] = v;
      }
    }
    if (Object.keys(cleaned).length > 0) {
      rules[field.key] = cleaned;
    }
  }
  return rules;
}

export function fieldsToSchema(fields: FieldDefinition[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (!field.key) continue;

    if (field.type === "table") {
      const itemProps: Record<string, unknown> = {};
      const itemRequired: string[] = [];
      for (const col of field.columns ?? []) {
        if (!col.key) continue;
        const p: Record<string, unknown> = { type: col.type, title: col.title || col.key };
        if (col.type === "enum" && col.enumValues.length > 0) {
          p.type = "string";
          p.enum = col.enumValues;
        }
        if (col.type === "date") {
          p.type = "string";
          p.format = "date";
        }
        itemProps[col.key] = p;
        if (col.required) itemRequired.push(col.key);
      }
      const items: Record<string, unknown> = { type: "object", properties: itemProps };
      if (itemRequired.length > 0) items.required = itemRequired;
      properties[field.key] = { type: "array", title: field.title || field.key, items };
      if (field.required) required.push(field.key);
      continue;
    }

    const prop: Record<string, unknown> = { type: field.type, title: field.title || field.key };
    if (field.type === "enum" && field.enumValues.length > 0) {
      prop.type = "string";
      prop.enum = field.enumValues;
    }
    if (field.type === "date") {
      prop.type = "string";
      prop.format = "date";
    }
    properties[field.key] = prop;
    if (field.required) required.push(field.key);
  }

  const schema: Record<string, unknown> = {
    type: "object",
    title: "Document",
    properties,
  };
  if (required.length > 0) schema.required = required;
  return schema;
}

export function schemaToFields(
  schema: Record<string, unknown>,
): FieldDefinition[] {
  const properties = (schema.properties as Record<string, unknown>) ?? {};
  const required = (schema.required as string[]) ?? [];
  const fields: FieldDefinition[] = [];

  for (const [key, val] of Object.entries(properties)) {
    const prop = val as Record<string, unknown>;
    const type = (prop.type as string) ?? "string";
    const enumValues = (prop.enum as string[]) ?? [];
    const format = prop.format as string;
    if (type === "array") {
      const items = prop.items as Record<string, unknown> | undefined;
      if (items && items.type === "object") {
        const itemProps = (items.properties as Record<string, unknown>) ?? {};
        const itemRequired = (items.required as string[]) ?? [];
        const columns: FieldDefinition[] = [];
        for (const [colKey, colVal] of Object.entries(itemProps)) {
          const colProp = colVal as Record<string, unknown>;
          const colType = (colProp.type as string) ?? "string";
          const colEnum = (colProp.enum as string[]) ?? [];
          const colFormat = colProp.format as string;
          let colFieldType: FieldDefinition["type"] = "string";
          if (colType === "number") colFieldType = "number";
          else if (colType === "boolean") colFieldType = "boolean";
          else if (colFormat === "date") colFieldType = "date";
          else if (colEnum.length > 0) colFieldType = "enum";
          columns.push({
            key: colKey,
            type: colFieldType,
            title: (colProp.title as string) ?? colKey,
            required: itemRequired.includes(colKey),
            enumValues: colEnum,
          });
        }
        fields.push({
          key,
          type: "table",
          title: (prop.title as string) ?? key,
          required: required.includes(key),
          enumValues: [],
          columns,
        });
        continue;
      }
    }

    let fieldType: FieldDefinition["type"] = "string";
    if (type === "number") fieldType = "number";
    else if (type === "boolean") fieldType = "boolean";
    else if (format === "date") fieldType = "date";
    else if (enumValues.length > 0) fieldType = "enum";

    fields.push({
      key,
      type: fieldType,
      title: (prop.title as string) ?? key,
      required: required.includes(key),
      enumValues,
    });
  }

  return fields;
}
