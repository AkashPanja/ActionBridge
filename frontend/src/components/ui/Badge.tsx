import { cn } from "../../lib/utils";

const variants = {
  default: "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300",
  primary: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
