import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dialog } from "../components/ui/Dialog";
import { RegexBuilder } from "../components/schema/RegexBuilder";
import { useRegexPatterns, useCreateRegexPattern, useUpdateRegexPattern, useDeleteRegexPattern } from "../hooks/useRegexPatterns";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";

export function ValidationPatternsPage() {
  const { data: patterns, isLoading } = useRegexPatterns();
  const createPattern = useCreateRegexPattern();
  const updatePattern = useUpdateRegexPattern();
  const deletePattern = useDeleteRegexPattern();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = patterns?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.pattern.includes(q);
  });

  function openCreate() {
    setEditingId(null);
    setName("");
    setPattern("");
    setFlags("");
    setDescription("");
    setError("");
    setEditorOpen(true);
  }

  function openEdit(p: { id: string; name: string; pattern: string; flags: string; description: string | null }) {
    setEditingId(p.id);
    setName(p.name);
    setPattern(p.pattern);
    setFlags(p.flags);
    setDescription(p.description ?? "");
    setError("");
    setEditorOpen(true);
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!pattern.trim()) { setError("Pattern is required"); return; }
    try {
      if (editingId) {
        await updatePattern.mutateAsync({
          id: editingId,
          data: { name: name.trim(), pattern: pattern.trim(), flags, description: description.trim() || undefined },
        });
      } else {
        await createPattern.mutateAsync({ name: name.trim(), pattern: pattern.trim(), flags, description: description.trim() || undefined });
      }
      setEditorOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePattern.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Validation Patterns</h1>
          <p className="mt-1 text-sm text-surface-500">Manage reusable regex patterns for document field validation.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Pattern
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patterns by name or regex..."
          className="w-full rounded-xl border border-surface-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-100 dark:bg-surface-800" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{p.name}</h3>
                    <span className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-xs text-surface-500 dark:bg-surface-700 dark:text-surface-400">
                      /{p.pattern}/{p.flags}
                    </span>
                  </div>
                  {p.description ? (
                    <p className="mt-1 text-xs text-surface-500">{p.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-900/20"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(p.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-accent-50 hover:text-accent-500 dark:hover:bg-accent-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-surface-200 p-12 text-center dark:border-surface-700">
          <p className="text-sm text-surface-400">
            {search ? "No patterns match your search." : "No validation patterns yet. Create your first one to reuse across document fields."}
          </p>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editingId ? "Edit Pattern" : "New Pattern"}
        description="Define a named regex pattern that can be reused in field validation rules."
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. alphanumeric, email_format"
              className="w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>

          <RegexBuilder
            pattern={pattern}
            flags={flags}
            onPatternChange={setPattern}
            onFlagsChange={setFlags}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this pattern validates"
              className="w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-accent-50 px-4 py-2 text-sm text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">{error}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} isLoading={createPattern.isPending || updatePattern.isPending}>
              {editingId ? "Save Changes" : "Create Pattern"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title="Delete Pattern"
        description="Are you sure you want to delete this pattern? It will be removed from all validation rules that reference it."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-accent-50 p-4 dark:bg-accent-900/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
            <p className="text-sm text-accent-700 dark:text-accent-300">
              Documents using this pattern for validation may behave differently after deletion.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} isLoading={deletePattern.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
