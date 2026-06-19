import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-200 dark:bg-surface-700",
        className,
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-800/50">
      <Skeleton className="mb-3 h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
