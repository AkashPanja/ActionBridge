import { motion } from "framer-motion";
import { FileType, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { can } from "../../lib/rbac";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDeleteDocumentType, useDocumentTypes } from "../../hooks/useDocumentTypes";
import { formatDate } from "../../lib/utils";
import { DocumentTypeCreateDialog } from "./DocumentTypeCreate";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

interface Props {
  projectId?: string;
}

export function DocumentTypeList({ projectId: propProjectId }: Props) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId ?? params.projectId!;
  const { data: docTypes, isLoading } = useDocumentTypes(projectId);
  const { user } = useAuth();
  const deleteDocType = useDeleteDocumentType(projectId);
  const [createOpen, setCreateOpen] = useState(false);

  const fieldCount = (schema: Record<string, unknown>) => {
    const props = (schema as { properties?: Record<string, unknown> }).properties;
    return props ? Object.keys(props).length : 0;
  };

  return (
    <div>
      {user && can(user.role, "document_types:write") ? (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-brand-500/40 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Document Type
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : docTypes && docTypes.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {docTypes.map((dt) => (
            <motion.div key={dt.id} variants={item}>
              <Card className="group relative overflow-hidden">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <FileType className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {dt.name}
                    </h3>
                    <p className="text-xs text-surface-400">
                      {fieldCount(dt.schema_definition)} fields
                    </p>
                  </div>
                  <Badge variant="default">
                    {formatDate(dt.created_at).split(",")[0]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(
                    (dt.schema_definition as { properties?: Record<string, unknown> }).properties ?? {},
                  ).slice(0, 4).map((key) => (
                    <span
                      key={key}
                      className="rounded-lg bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300"
                    >
                      {key.replace(/_/g, " ")}
                    </span>
                  ))}
                  {fieldCount(dt.schema_definition) > 4 ? (
                    <span className="rounded-lg bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-400 dark:bg-surface-700">
                      +{fieldCount(dt.schema_definition) - 4}
                    </span>
                  ) : null}
                </div>
                {user && can(user.role, "document_types:write") ? (
                  <button
                    onClick={() => {
                      if (confirm("Delete this document type?")) {
                        deleteDocType.mutate(dt.id);
                      }
                    }}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 opacity-0 transition-all hover:bg-accent-50 hover:text-accent-500 group-hover:opacity-100 dark:hover:bg-accent-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={<FileType className="h-8 w-8" />}
          title="No document types"
          description="Define your first document schema. Each document type has its own JSON schema and validation rules."
          action={(user && can(user.role, "document_types:write")) ? {
            label: "Create Document Type",
            onClick: () => setCreateOpen(true),
          } : undefined}
        />
      )}

      <DocumentTypeCreateDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
