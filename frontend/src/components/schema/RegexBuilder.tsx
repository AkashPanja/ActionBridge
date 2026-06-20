import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Props {
  pattern: string;
  flags: string;
  onPatternChange: (pattern: string) => void;
  onFlagsChange: (flags: string) => void;
  compact?: boolean;
}

function tryCompile(pattern: string, flags: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export function RegexBuilder({ pattern, flags, onPatternChange, onFlagsChange, compact }: Props) {
  const [testString, setTestString] = useState("");

  const compiled = useMemo(() => tryCompile(pattern, flags), [pattern, flags]);
  const isValid = compiled !== null;
  const errorMessage = useMemo(() => {
    if (!pattern) return null;
    if (!isValid) {
      try { new RegExp(pattern, flags); return null; }
      catch (e) { return (e as Error).message; }
    }
    return null;
  }, [pattern, flags, isValid]);

  const matches = useMemo(() => {
    if (!compiled || !testString) return [];
    const results: { index: number; match: string }[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(compiled.source, compiled.flags.includes("g") ? compiled.flags : compiled.flags + "g");
    while ((m = re.exec(testString)) !== null) {
      results.push({ index: m.index, match: m[0] });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return results;
  }, [compiled, testString]);

  const toggleFlag = (flag: string) => {
    const next = flags.includes(flag) ? flags.replace(flag, "") : flags + flag;
    onFlagsChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Pattern</label>
        <div className="relative">
          <input
            type="text"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder={"^\\w+@\\w+\\.\\w+$"}
            className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none ${
              pattern && !isValid
                ? "border-accent-300 bg-accent-50/50 focus:border-accent-500 dark:border-accent-700 dark:bg-accent-900/10"
                : pattern
                  ? "border-emerald-300 bg-emerald-50/50 focus:border-emerald-500 dark:border-emerald-700 dark:bg-emerald-900/10"
                  : "border-surface-200 bg-white focus:border-brand-500 dark:border-surface-600 dark:bg-surface-800"
            } dark:text-surface-100`}
          />
          {pattern ? (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-accent-500" />
              )}
            </span>
          ) : null}
        </div>
        {errorMessage ? (
          <p className="mt-1 text-xs text-accent-500">{errorMessage}</p>
        ) : null}
      </div>

      <div className="flex gap-3">
        {["i", "m", "s"].map((f) => (
          <label key={f} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flags.includes(f)}
              onChange={() => toggleFlag(f)}
              className="rounded border-surface-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs font-mono font-medium text-surface-600 dark:text-surface-400">
              {f === "i" ? "Case insensitive" : f === "m" ? "Multiline" : "Dot all"}
            </span>
          </label>
        ))}
      </div>

      {!compact ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Test string</label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter test text to see matches..."
            rows={3}
            className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
      ) : null}

      {!compact && testString ? (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
              {isValid ? `${matches.length} match${matches.length !== 1 ? "es" : ""}` : "Invalid pattern"}
            </span>
            {isValid && matches.length > 0 ? (
              <span className="text-xs text-surface-400">
                (positions: {matches.map((m) => m.index).join(", ")})
              </span>
            ) : null}
          </div>
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 font-mono text-sm whitespace-pre-wrap break-all dark:border-surface-600 dark:bg-surface-800/50 dark:text-surface-100">
            {isValid && compiled
              ? (() => {
                  const parts: { text: string; match: boolean }[] = [];
                  let lastIndex = 0;
                  const re = new RegExp(compiled.source, compiled.flags.includes("g") ? compiled.flags : compiled.flags + "g");
                  let m: RegExpExecArray | null;
                  while ((m = re.exec(testString)) !== null) {
                    if (m.index > lastIndex) {
                      parts.push({ text: testString.slice(lastIndex, m.index), match: false });
                    }
                    parts.push({ text: m[0], match: true });
                    lastIndex = re.lastIndex;
                    if (m.index === re.lastIndex) re.lastIndex++;
                  }
                  if (lastIndex < testString.length) {
                    parts.push({ text: testString.slice(lastIndex), match: false });
                  }
                  return parts.length > 0 ? (
                    parts.map((p, i) =>
                      p.match ? (
                        <mark key={i} className="rounded bg-brand-200 px-0.5 text-surface-900 dark:bg-brand-700 dark:text-surface-100">
                          {p.text}
                        </mark>
                      ) : (
                        <span key={i}>{p.text}</span>
                      ),
                    )
                  ) : (
                    <span className="text-surface-400">No matches</span>
                  );
                })()
              : testString}
          </div>
        </div>
      ) : null}
    </div>
  );
}
