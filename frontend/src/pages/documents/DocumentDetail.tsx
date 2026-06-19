import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, History, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedPage } from "../../components/shared/AnimatedPage";
import { useDocument, useUpdateDocument } from "../../hooks/useDocuments";
import { useDocumentType } from "../../hooks/useDocumentTypes";
import { formatDate } from "../../lib/utils";
import type { AuditEvent } from "../../types";

const statusColors: Record<string, string> = {
  received: "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
};

function confidenceColor(score: number | undefined): string {
  if (score == null) return "border-surface-200 dark:border-surface-600";
  if (score >= 0.85) return "border-emerald-400 dark:border-emerald-600";
  if (score >= 0.70) return "border-amber-400 dark:border-amber-600";
  return "border-accent-400 dark:border-accent-600";
}

function confidenceBadge(score: number | undefined) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = score >= 0.85 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : score >= 0.70 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`} title={`Confidence: ${pct}%`}>
      {pct}%
    </span>
  );
}

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="relative space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {!isLast ? (
              <div className="absolute left-[11px] top-5 h-full w-px bg-surface-200 dark:bg-surface-600" />
            ) : null}
            <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-white dark:border-brand-800 dark:bg-surface-800">
              <div className="h-2 w-2 rounded-full bg-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  {event.action.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-surface-400">{formatDate(event.timestamp)}</span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400">by {event.actor}</p>
              {event.field_name ? (
                <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">Field: {event.field_name}</p>
              ) : null}
              {event.comment ? (
                <p className="mt-0.5 rounded-lg bg-surface-100 px-3 py-1.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                  "{event.comment}"
                </p>
              ) : null}
              {event.old_value && event.new_value ? (
                <div className="mt-1 flex gap-2 text-xs">
                  <span className="rounded bg-accent-50 px-1.5 py-0.5 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">
                    {JSON.stringify(event.old_value)}
                  </span>
                  <span className="text-surface-400">→</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {JSON.stringify(event.new_value)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DocumentDetail() {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useDocument(projectId!, docId!, true);
  const { data: docType } = useDocumentType(projectId!, doc?.document_type_id ?? "");
  const updateDoc = useUpdateDocument(projectId!);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [comment, setComment] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (doc?.extracted_data && Object.keys(formData).length === 0) {
      setFormData({ ...(doc.extracted_data as Record<string, unknown>) });
    }
  }, [doc]);

  function handleFieldChange(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function handleSave() {
    if (!doc) return;
    await updateDoc.mutateAsync({ docId: doc.id, data: { extracted_data: formData, comment: comment || undefined } });
    setHasChanges(false);
    setComment("");
  }

  async function handleApprove() {
    if (!doc) return;
    await updateDoc.mutateAsync({ docId: doc.id, data: { status: "approved", comment: comment || undefined } });
    setComment("");
  }

  async function handleReject() {
    if (!doc) return;
    await updateDoc.mutateAsync({ docId: doc.id, data: { status: "rejected", comment: comment || undefined } });
    setComment("");
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </AnimatedPage>
    );
  }

  if (!doc) {
    return (
      <AnimatedPage>
        <p className="text-surface-500">Document not found.</p>
      </AnimatedPage>
    );
  }

  const schema = docType?.schema_definition as { properties?: Record<string, unknown>; required?: string[] } | undefined;
  const schemaProperties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  const confidenceScores = (doc.confidence_scores ?? {}) as Record<string, number>;
  const canEdit = doc.status === "pending_review" || doc.status === "received";

  return (
    <AnimatedPage>
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 transition-colors hover:text-surface-700 dark:hover:text-surface-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">
              {doc.document_type_name ?? "Document"}
            </h1>
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusColors[doc.status] ?? ""}`}>
              {doc.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-surface-500">
            Created {formatDate(doc.created_at)}
            {doc.confidence_score != null ? ` · Avg confidence: ${Math.round(doc.confidence_score * 100)}%` : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleReject} isLoading={updateDoc.isPending}>
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button variant="primary" size="sm" onClick={handleApprove} isLoading={updateDoc.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Extracted Data</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(formData).map(([key, value]) => {
                const prop = schemaProperties[key] as Record<string, unknown> | undefined;
                const propType = prop?.type as string | undefined;
                const propTitle = prop?.title as string | undefined;
                const propEnum = prop?.enum as string[] | undefined;
                const propFormat = prop?.format as string | undefined;
                const isRequired = required.includes(key);
                const score = confidenceScores[key];

                const borderClass = confidenceColor(score);
                const label = (
                  <span className="flex items-center gap-1.5">
                    {propTitle ?? key}
                    {isRequired ? <span className="text-accent-500">*</span> : null}
                    {confidenceBadge(score)}
                  </span>
                );

                if (propEnum) {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
                      <select
                        value={String(value ?? "")}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={!canEdit}
                        className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-100 ${borderClass}`}
                      >
                        <option value="">Select...</option>
                        {propEnum.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (propFormat === "date") {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
                      <input
                        type="date"
                        value={String(value ?? "")}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={!canEdit}
                        className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-100 ${borderClass}`}
                      />
                    </div>
                  );
                }

                if (propType === "number") {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
                      <input
                        type="number"
                        step="any"
                        value={String(value ?? "")}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={!canEdit}
                        className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-100 ${borderClass}`}
                      />
                    </div>
                  );
                }

                if (propType === "boolean") {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
                      <select
                        value={String(value ?? "")}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={!canEdit}
                        className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-100 ${borderClass}`}
                      >
                        <option value="">Select...</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={key} className="space-y-1.5">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
                    <input
                      type="text"
                      value={String(value ?? "")}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      disabled={!canEdit}
                      className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-100 ${borderClass}`}
                    />
                  </div>
                );
              })}
            </div>

            {canEdit ? (
              <div className="space-y-3 pt-2">
                <Input
                  label="Comment (optional)"
                  placeholder="Add a note about this change..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  id="comment"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} isLoading={updateDoc.isPending} disabled={!hasChanges && !comment}>
                    Save Changes
                  </Button>
                  {hasChanges ? (
                    <Button variant="ghost" onClick={() => { setFormData({ ...(doc.extracted_data as Record<string, unknown>) }); setHasChanges(false); }}>
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-surface-400" />
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Audit History</h2>
            </div>
            {doc.history && doc.history.length > 0 ? (
              <AuditTimeline events={doc.history} />
            ) : (
              <p className="py-8 text-center text-sm text-surface-400">No history yet</p>
            )}
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
}
