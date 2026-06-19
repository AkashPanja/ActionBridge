import { useState } from "react";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useCreateProject } from "../../hooks/useProjects";

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectCreateDialog({ open, onOpenChange }: ProjectCreateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createProject = useCreateProject();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Project"
      description="Set up a new project to organize your document types."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g. Acme Corp Invoices"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          id="project-name"
        />
        <Input
          label="Description (optional)"
          placeholder="Brief description of the project"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          id="project-desc"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createProject.isPending}>
            Create Project
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
