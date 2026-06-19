export interface DocumentType {
  id: string;
  project_id: string;
  name: string;
  schema_definition: Record<string, unknown>;
  validation_rules: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
