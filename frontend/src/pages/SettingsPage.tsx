import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = "/api/v1";

export function SettingsPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleReset() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Reset failed" }));
        throw new Error(err.detail);
      }
      logout();
      navigate("/setup", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Settings</h1>
        <p className="mt-1 text-sm text-surface-500">Manage your system configuration.</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Reset System</h2>
            <p className="mt-1 text-sm text-surface-500">
              Deletes all projects, documents, users, and settings. Returns the system to a fresh state so you can run the setup wizard again.
            </p>
            <div className="mt-4">
              {showConfirm ? (
                <div className="space-y-3 rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-800 dark:bg-accent-900/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                    <p className="text-sm font-medium text-accent-700 dark:text-accent-300">
                      This action cannot be undone. Type <strong>reset</strong> to confirm.
                    </p>
                  </div>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type 'reset' to confirm"
                    className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:border-accent-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={handleReset} isLoading={loading} disabled={confirmText !== "reset"}>
                      <Trash2 className="h-4 w-4" /> Reset Everything
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowConfirm(false); setConfirmText(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
                  <Trash2 className="h-4 w-4" /> Reset System
                </Button>
              )}
            </div>
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-xl bg-accent-50 px-4 py-2 text-sm text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">{error}</p>
        ) : null}
      </Card>
    </div>
  );
}
