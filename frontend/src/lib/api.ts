import type { Document, DocumentType, Project, RegexPattern } from "../types";

const BASE_URL = "/api/v1";

function getToken(): string | null {
  try {
    return localStorage.getItem("doc_action_token");
  } catch {
    return null;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("doc_action_token");
      localStorage.removeItem("doc_action_user");
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Something went wrong");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  projects: {
    list: (search?: string) =>
      request<Project[]>(`/projects${search ? `?search=${search}` : ""}`),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; description: string }>) =>
      request<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/projects/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      request<{ deleted: number }>("/projects/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  },
  documentTypes: {
    list: (projectId: string) =>
      request<DocumentType[]>(`/projects/${projectId}/document-types`),
    get: (projectId: string, typeId: string) =>
      request<DocumentType>(`/projects/${projectId}/document-types/${typeId}`),
    create: (
      projectId: string,
      data: { name: string; schema_definition: Record<string, unknown>; validation_rules?: Record<string, unknown> }
    ) =>
      request<DocumentType>(`/projects/${projectId}/document-types`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: string, typeId: string, data: Partial<{ name: string; schema_definition: Record<string, unknown>; validation_rules: Record<string, unknown> }>) =>
      request<DocumentType>(`/projects/${projectId}/document-types/${typeId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, typeId: string) =>
      request<void>(`/projects/${projectId}/document-types/${typeId}`, { method: "DELETE" }),
    clone: (projectId: string, typeId: string, data: { name: string }) =>
      request<DocumentType>(`/projects/${projectId}/document-types/${typeId}/clone`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkDelete: (projectId: string, ids: string[]) =>
      request<{ deleted: number }>(`/projects/${projectId}/document-types/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  },
  regexPatterns: {
    list: () => request<RegexPattern[]>("/regex-patterns"),
    get: (id: string) => request<RegexPattern>(`/regex-patterns/${id}`),
    create: (data: { name: string; pattern: string; flags?: string; description?: string }) =>
      request<RegexPattern>("/regex-patterns", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; pattern: string; flags: string; description: string }>) =>
      request<RegexPattern>(`/regex-patterns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/regex-patterns/${id}`, { method: "DELETE" }),
  },
  documents: {
    list: (projectId: string, params?: { status?: string; document_type_id?: string; search?: string; date_from?: string; date_to?: string; confidence_min?: number; confidence_max?: number; sort_by?: string; sort_order?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.document_type_id) qs.set("document_type_id", params.document_type_id);
      if (params?.search) qs.set("search", params.search);
      if (params?.date_from) qs.set("date_from", params.date_from);
      if (params?.date_to) qs.set("date_to", params.date_to);
      if (params?.confidence_min != null) qs.set("confidence_min", String(params.confidence_min));
      if (params?.confidence_max != null) qs.set("confidence_max", String(params.confidence_max));
      if (params?.sort_by) qs.set("sort_by", params.sort_by);
      if (params?.sort_order) qs.set("sort_order", params.sort_order);
      const q = qs.toString();
      return request<Document[]>(`/projects/${projectId}/documents${q ? `?${q}` : ""}`);
    },
    get: (projectId: string, docId: string, includeHistory = false) =>
      request<Document>(`/projects/${projectId}/documents/${docId}${includeHistory ? "?include_history=true" : ""}`),
    submit: (projectId: string, typeId: string, data: { extracted_data: Record<string, unknown>; confidence_scores?: Record<string, number> }) =>
      request<Document>(`/projects/${projectId}/documents/document-types/${typeId}?actor=rpa_bot`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: string, docId: string, data: { extracted_data?: Record<string, unknown>; confidence_scores?: Record<string, number>; status?: string; comment?: string }) =>
      request<Document>(`/projects/${projectId}/documents/${docId}?actor=user`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, docId: string) =>
      request<void>(`/projects/${projectId}/documents/${docId}`, { method: "DELETE" }),
    bulkDelete: (projectId: string, ids: string[]) =>
      request<{ deleted: number }>(`/projects/${projectId}/documents/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  },
};
