export interface FieldDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "date" | "enum";
  title: string;
  required: boolean;
  enumValues: string[];
}

export function fieldsToSchema(fields: FieldDefinition[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (!field.key) continue;
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

export function schemaToFields(schema: Record<string, unknown>): FieldDefinition[] {
  const properties = (schema.properties as Record<string, unknown>) ?? {};
  const required = (schema.required as string[]) ?? [];
  const fields: FieldDefinition[] = [];

  for (const [key, val] of Object.entries(properties)) {
    const prop = val as Record<string, unknown>;
    const type = (prop.type as string) ?? "string";
    const enumValues = (prop.enum as string[]) ?? [];
    const format = prop.format as string;

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
