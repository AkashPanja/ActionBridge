import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useRegexPatterns() {
  return useQuery({
    queryKey: ["regex-patterns"],
    queryFn: () => api.regexPatterns.list(),
  });
}

export function useCreateRegexPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.regexPatterns.create>[0]) =>
      api.regexPatterns.create(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["regex-patterns"] }),
  });
}

export function useUpdateRegexPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.regexPatterns.update>[1] }) =>
      api.regexPatterns.update(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["regex-patterns"] }),
  });
}

export function useDeleteRegexPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.regexPatterns.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["regex-patterns"] }),
  });
}
