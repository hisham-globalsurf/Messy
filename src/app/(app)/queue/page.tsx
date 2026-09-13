"use client";

import { QueueList } from "@/components/feature/queue-list";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feature/states";
import { useQueue } from "@/lib/client/hooks";

export default function QueuePage() {
  const { data: orders, error, isLoading, mutate } = useQueue();

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-semibold lg:text-2xl">Queue</h1>

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message="Could not load the queue" onRetry={() => mutate()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="No pending orders"
          hint="Member orders submitted from /order will show up here live."
        />
      ) : (
        <QueueList orders={orders} />
      )}
    </div>
  );
}
