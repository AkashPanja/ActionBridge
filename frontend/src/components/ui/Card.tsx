import { cn } from "../../lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-200/60 bg-white p-6 shadow-sm",
        "dark:border-surface-700/50 dark:bg-surface-800/50",
        "transition-all duration-300",
        hover && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
