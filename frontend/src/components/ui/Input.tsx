import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm text-surface-900",
            "placeholder:text-surface-400",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            "dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500",
            "transition-all duration-200",
            error && "border-accent-500 focus:border-accent-500 focus:ring-accent-500/20",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-accent-500">{error}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
