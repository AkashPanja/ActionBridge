import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDocumentTypes(projectId: string) {
  return useQuery({
    queryKey: ["document-types", projectId],
    queryFn: () => api.documentTypes.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateDocumentType(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.documentTypes.create>[1]) =>
      api.documentTypes.create(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["document-types", projectId] }),
  });
}

export function useDocumentType(projectId: string, typeId: string) {
  return useQuery({
    queryKey: ["document-types", projectId, typeId],
    queryFn: () => api.documentTypes.get(projectId, typeId),
    enabled: !!projectId && !!typeId,
  });
}

export function useUpdateDocumentType(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      data,
    }: {
      typeId: string;
      data: Parameters<typeof api.documentTypes.update>[2];
    }) => api.documentTypes.update(projectId, typeId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["document-types", projectId] }),
  });
}

export function useDeleteDocumentType(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) =>
      api.documentTypes.delete(projectId, typeId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["document-types", projectId] }),
  });
}

export function useBulkDeleteDocumentTypes(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.documentTypes.bulkDelete(projectId, ids),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["document-types", projectId] }),
  });
}
