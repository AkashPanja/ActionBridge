import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, FileText, Inbox, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { cn, formatDate } from "../lib/utils";

const API_BASE = "/api/v1";

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

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  comment: string | null;
  timestamp: string;
  document_type_name: string;
}

interface Stats {
  total_documents: number;
  status_breakdown: StatusCount[];
  avg_confidence: number | null;
  by_document_type: TypeCount[];
  daily_volume: DailyVol[];
}

const STATUS_COLORS: Record<string, string> = {
  received: "#94A3B8",
  pending_review: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
};

const STATUS_ORDER = ["received", "pending_review", "approved", "rejected"];

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/projects/${projectId}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/projects/${projectId}/recent-activity`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (aRes.ok) setActivity(await aRes.json());
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

  // Prepare data for line chart: aggregate daily volume by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const d of stats.daily_volume) {
    if (!dateMap.has(d.date)) dateMap.set(d.date, {});
    dateMap.get(d.date)![d.status] = (dateMap.get(d.date)![d.status] ?? 0) + d.count;
  }
  const lineChartData = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, counts]) => ({
    date: date.slice(5),
    received: counts.received ?? 0,
    pending_review: counts.pending_review ?? 0,
    approved: counts.approved ?? 0,
    rejected: counts.rejected ?? 0,
  }));

  // Pie chart data
  const pieData = stats.status_breakdown.map((b) => ({
    name: STATUS_LABELS[b.status] ?? b.status,
    value: b.count,
    status: b.status,
  }));

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
          <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Status Distribution</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Documents"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-surface-400">No data yet.</p>
          )}
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

      {lineChartData.length > 0 ? (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Daily Volume (7 days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" allowDecimals={false} />
              <Tooltip />
              <Legend />
              {(["received", "pending_review", "approved", "rejected"] as const).map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={STATUS_COLORS[s]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={STATUS_LABELS[s]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
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

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Recent Activity</h3>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-800">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <RefreshCw className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-surface-900 dark:text-surface-100 capitalize">
                      {a.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-surface-400">•</span>
                    <span className="text-surface-500">{a.document_type_name}</span>
                    <span className="text-surface-400">•</span>
                    <span className="text-surface-400">{formatDate(a.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">by {a.actor}</p>
                  {a.comment ? (
                    <p className="mt-0.5 text-xs text-surface-400 italic">"{a.comment}"</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-surface-400">No recent activity.</p>
        )}
      </Card>
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
