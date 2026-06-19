import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, FileText, Inbox, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

interface StatusCount {
  status: string;
  count: number;
}

interface TypeCount {
  name: string;
  count: number;
}

interface DailyVol {
  date: string;
  status: string;
  count: number;
}

interface Stats {
  total_documents: number;
  status_breakdown: StatusCount[];
  avg_confidence: number | null;
  by_document_type: TypeCount[];
  daily_volume: DailyVol[];
}

const API_BASE = "/api/v1";
const statusColor: Record<string, string> = {
  received: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
};

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStats(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!stats) return null;

  const findCount = (s: string) => stats.status_breakdown.find((b) => b.status === s)?.count ?? 0;
  const received = findCount("received");
  const pending = findCount("pending_review");
  const approved = findCount("approved");
  const rejected = findCount("rejected");

  const bucket = (status: string) => {
    const days: Record<string, number> = {};
    stats.daily_volume.filter((d) => d.status === status).forEach((d) => { days[d.date] = d.count; });
    return days;
  };
  const approvedByDay = bucket("approved");
  const receivedByDay = bucket("received");
  const allDates = [...new Set(stats.daily_volume.map((d) => d.date))].sort();

  const maxDay = Math.max(1, ...allDates.map((d) => (approvedByDay[d] ?? 0) + (receivedByDay[d] ?? 0)));

  const pct = stats.total_documents > 0 ? Math.round((approved / stats.total_documents) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Documents" value={stats.total_documents} color="brand" />
        <StatCard icon={Inbox} label="Pending Review" value={pending} color="amber" />
        <StatCard icon={CheckCircle2} label="Approved" value={approved} color="emerald" />
        <StatCard icon={TrendingUp} label="Approval Rate" value={`${pct}%`} color="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Status Breakdown</h3>
          <div className="space-y-3">
            {stats.status_breakdown.map((b) => {
              const pct = stats.total_documents > 0 ? (b.count / stats.total_documents) * 100 : 0;
              return (
                <div key={b.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-surface-600 dark:text-surface-300">
                      {b.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-surface-400">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700">
                    <div
                      className={`h-2 rounded-full transition-all ${statusColor[b.status]?.split(" ")[0] ?? "bg-brand-500"}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">By Document Type</h3>
          <div className="space-y-3">
            {stats.by_document_type.map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <span className="text-sm text-surface-600 dark:text-surface-300">{t.name}</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{t.count}</span>
              </div>
            ))}
            {stats.by_document_type.length === 0 ? (
              <p className="text-sm text-surface-400">No documents yet.</p>
            ) : null}
          </div>
        </Card>
      </div>

      {allDates.length > 0 ? (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Daily Volume (7 days)</h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {allDates.map((date) => {
              const approvedCount = approvedByDay[date] ?? 0;
              const receivedCount = receivedByDay[date] ?? 0;
              const total = approvedCount + receivedCount;
              const approvedH = Math.round((approvedCount / maxDay) * 100);
              const receivedH = Math.round((receivedCount / maxDay) * 100);
              return (
                <div key={date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col-reverse" style={{ height: 100 }}>
                    <div
                      className="w-full rounded-t bg-emerald-400/70 transition-all dark:bg-emerald-600/70"
                      style={{ height: `${Math.max(2, approvedH)}%` }}
                      title={`Approved: ${approvedCount}`}
                    />
                    <div
                      className="w-full rounded-t bg-brand-400/70 transition-all dark:bg-brand-600/70"
                      style={{ height: `${Math.max(2, receivedH)}%` }}
                      title={`Received: ${receivedCount}`}
                    />
                  </div>
                  <span className="text-[10px] text-surface-400">{date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-brand-400/70" /> Received</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-emerald-400/70" /> Approved</span>
          </div>
        </Card>
      ) : null}

      {stats.avg_confidence != null ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Average Confidence</h3>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-surface-100 dark:bg-surface-700">
              <div
                className={`h-3 rounded-full transition-all ${stats.avg_confidence >= 0.85 ? "bg-emerald-500" : stats.avg_confidence >= 0.7 ? "bg-amber-500" : "bg-accent-500"}`}
                style={{ width: `${Math.round(stats.avg_confidence * 100)}%` }}
              />
            </div>
            <span className="text-lg font-bold text-surface-900 dark:text-surface-100">
              {Math.round(stats.avg_confidence * 100)}%
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color] ?? colorMap.brand}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500">{label}</p>
            <p className="text-xl font-bold text-surface-900 dark:text-surface-100">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
