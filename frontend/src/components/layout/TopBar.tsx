import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

export function TopBar() {
  const [dark, setDark] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: "/" + arr.slice(0, i + 1).join("/"),
      current: i === arr.length - 1,
    }));

  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-200/60 bg-white/50 px-6 backdrop-blur-xl dark:border-surface-700/50 dark:bg-surface-900/50">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
          Home
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-2">
            <span className="text-surface-300 dark:text-surface-600">/</span>
            <Link
              to={crumb.href}
              className={cn(
                "capitalize transition-colors",
                crumb.current
                  ? "font-medium text-surface-900 dark:text-surface-100"
                  : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-300",
              )}
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      <button
        onClick={toggleTheme}
        className="rounded-xl p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
