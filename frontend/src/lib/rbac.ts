const PERMISSION_MAP: Record<string, string[]> = {
  "projects:read": ["admin", "reviewer", "viewer"],
  "projects:write": ["admin"],
  "document_types:read": ["admin", "reviewer", "viewer"],
  "document_types:write": ["admin"],
  "documents:read": ["admin", "reviewer", "viewer"],
  "documents:write": ["admin", "reviewer"],
  "documents:approve": ["admin", "reviewer"],
  "api_keys:manage": ["admin"],
  "users:manage": ["admin"],
  "settings:read": ["admin"],
  "settings:write": ["admin"],
};

export function can(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  return PERMISSION_MAP[permission]?.includes(role) ?? false;
}

export type Role = "admin" | "reviewer" | "viewer";
