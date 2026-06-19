import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface DocListParams {
  status?: string;
  document_type_id?: string;
  search?: string;
}

export function useDocuments(projectId: string, params?: DocListParams) {
  return useQuery({
    queryKey: ["documents", projectId, params],
    queryFn: () => api.documents.list(projectId, params),
    enabled: !!projectId,
  });
}

export function useDocument(projectId: string, docId: string, includeHistory = false) {
  return useQuery({
    queryKey: ["documents", projectId, docId, includeHistory],
    queryFn: () => api.documents.get(projectId, docId, includeHistory),
    enabled: !!projectId && !!docId,
  });
}

export function useSubmitDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      extracted_data,
      confidence_scores,
    }: {
      typeId: string;
      extracted_data: Record<string, unknown>;
      confidence_scores?: Record<string, number>;
    }) => api.documents.submit(projectId, typeId, { extracted_data, confidence_scores }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}

export function useUpdateDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      data,
    }: {
      docId: string;
      data: { extracted_data?: Record<string, unknown>; status?: string; comment?: string };
    }) => api.documents.update(projectId, docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
    },
  });
}
