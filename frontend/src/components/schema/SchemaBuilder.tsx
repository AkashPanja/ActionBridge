import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { fieldsToSchema, schemaToFields, type FieldDefinition } from "./types";

interface Props {
  schema: Record<string, unknown>;
  onChange: (schema: Record<string, unknown>) => void;
}

function emptyField(): FieldDefinition {
  return { key: "", type: "string", title: "", required: false, enumValues: [] };
}

export function SchemaBuilder({ schema, onChange }: Props) {
  const [fields, setFields] = useState<FieldDefinition[]>(() => {
    const parsed = schemaToFields(schema);
    return parsed.length > 0 ? parsed : [emptyField()];
  });

  const generatedSchema = useMemo(() => fieldsToSchema(fields), [fields]);

  useEffect(() => {
    onChange(generatedSchema);
  }, [generatedSchema]);

  function updateField(index: number, partial: Partial<FieldDefinition>) {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()]);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-surface-200 dark:border-surface-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 dark:bg-surface-800">
              <th className="w-8 px-2 py-2"></th>
              <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Field Name</th>
              <th className="w-24 px-2 py-2 text-left text-xs font-medium text-surface-500">Type</th>
              <th className="w-16 px-2 py-2 text-center text-xs font-medium text-surface-500">Req.</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-surface-500">Enum Values</th>
              <th className="w-28 px-2 py-2 text-center text-xs font-medium text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={i} className="border-t border-surface-100 dark:border-surface-700">
                <td className="px-2 py-2 text-surface-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </td>
                <td className="px-2 py-2">
                  <input
                    value={field.key}
                    onChange={(e) => updateField(i, { key: e.target.value })}
                    placeholder="field_name"
                    className="w-full rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldDefinition["type"] })}
                    className="w-full rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                    <option value="enum">enum</option>
                  </select>
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                  />
                </td>
                <td className="px-2 py-2">
                  {field.type === "enum" ? (
                    <input
                      value={field.enumValues.join(", ")}
                      onChange={(e) => updateField(i, { enumValues: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="val1, val2, ..."
                      className="w-full rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                    />
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-0.5">
                    <button onClick={() => moveField(i, -1)} disabled={i === 0} className="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 dark:hover:bg-surface-700">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} className="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 dark:hover:bg-surface-700">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeField(i)} disabled={fields.length === 1} className="rounded p-1 text-accent-400 hover:bg-accent-50 hover:text-accent-600 disabled:opacity-30 dark:hover:bg-accent-900/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={addField} className="w-full">
        <Plus className="h-4 w-4" /> Add Field
      </Button>
    </div>
  );
}
