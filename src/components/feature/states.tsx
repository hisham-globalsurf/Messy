import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 py-10 text-center">
      <p className="font-medium text-destructive">{message}</p>
      {onRetry && (
        <button className="mt-2 text-sm underline" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}
