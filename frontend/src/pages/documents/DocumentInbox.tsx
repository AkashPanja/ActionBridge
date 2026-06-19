import { motion } from "framer-motion";
import { FileText, Filter, Inbox, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { useDocuments } from "../../hooks/useDocuments";
import { formatDate } from "../../lib/utils";

const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default" }> = {
  received: { label: "Received", variant: "default" },
  pending_review: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

interface Props {
  projectId: string;
}

export function DocumentInbox({ projectId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const navigate = useNavigate();

  const { data: docTypes } = useDocumentTypes(projectId);
  const { data: docs, isLoading } = useDocuments(projectId, {
    search: search || undefined,
    status: statusFilter || undefined,
    document_type_id: typeFilter || undefined,
  });

  function getStatusBadge(status: string) {
    const config = statusConfig[status] ?? { label: status, variant: "default" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Filter className="h-4 w-4 text-surface-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
        >
          <option value="">All statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
        >
          <option value="">All types</option>
          {docTypes?.map((dt) => (
            <option key={dt.id} value={dt.id}>
              {dt.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : docs && docs.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {docs.map((doc) => (
            <motion.div key={doc.id} variants={cardItem}>
              <Card
                hover
                onClick={() => navigate(`/projects/${projectId}/documents/${doc.id}`)}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {doc.document_type_name ?? "Document"}
                    </span>
                    {getStatusBadge(doc.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-surface-400">
                    {formatDate(doc.created_at)}
                    {doc.confidence_score != null
                      ? ` · Avg confidence: ${Math.round(doc.confidence_score * 100)}%`
                      : ""}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(doc.extracted_data as Record<string, unknown>)
                      .slice(0, 3)
                      .map(([key, val]) => (
                        <span
                          key={key}
                          className="rounded-lg bg-surface-100 px-2 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300"
                        >
                          {String(val).substring(0, 20)}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="shrink-0 text-surface-300 dark:text-surface-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="No documents yet"
          description="Submit documents via the API or wait for RPA bots to send them."
        />
      )}
    </div>
  );
}
