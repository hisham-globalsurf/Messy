"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/format";
import type { QueueOrderItem } from "@/types";

function refresh() {
  return Promise.all([
    globalMutate("/api/queue"),
    globalMutate((key) => typeof key === "string" && key.startsWith("/api/entries")),
  ]);
}

export function QueueList({ orders }: { orders: QueueOrderItem[] }) {
  const groups = groupByDate(orders);

  return (
    <div className="space-y-6">
      {groups.map(([date, rows]) => (
        <QueueDateGroup key={date} date={date} rows={rows} />
      ))}
    </div>
  );
}

function QueueDateGroup({ date, rows }: { date: string; rows: QueueOrderItem[] }) {
  const [movingAll, setMovingAll] = useState(false);

  async function moveAll() {
    setMovingAll(true);
    try {
      const result = await mutateApi<{ movedCount: number }>("/api/queue/move", "POST", { date });
      await refresh();
      toast.success(`Moved ${result.movedCount} order${result.movedCount === 1 ? "" : "s"} to entries`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move orders");
    } finally {
      setMovingAll(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{formatDate(date)}</h3>
        <Button size="sm" variant="outline" onClick={moveAll} disabled={movingAll} className="gap-1.5">
          {movingAll ? <Spinner /> : <ArrowRightCircle className="size-4" />}
          Move all to entries
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map((row) => (
          <QueueRow key={row._id} row={row} />
        ))}
      </ul>
    </div>
  );
}

function QueueRow({ row }: { row: QueueOrderItem }) {
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function move() {
    setMoving(true);
    try {
      await mutateApi(`/api/queue/${row._id}/move`, "POST");
      await refresh();
      toast.success(`Moved ${row.personName}'s order`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move order");
    } finally {
      setMoving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await mutateApi(`/api/queue/${row._id}`, "DELETE");
      await refresh();
      toast.success("Removed from queue");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
      setDeleting(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{row.personName}</p>
        <p className="text-xs text-muted-foreground">
          {row.kind === "full"
            ? `Full${row.count > 1 ? ` ×${row.count}` : ""}${row.variant ? ` — ${row.variant}` : ""}`
            : `Half with ${row.partnerName}${row.variant ? ` — ${row.variant}` : ""}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={move} disabled={moving || deleting} aria-label="Move to entries">
          {moving ? <Spinner /> : <ArrowRightCircle className="size-4" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={remove}
          disabled={moving || deleting}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete from queue"
        >
          {deleting ? <Spinner /> : <Trash2 className="size-4" />}
        </Button>
      </div>
    </li>
  );
}

function groupByDate(orders: QueueOrderItem[]): [string, QueueOrderItem[]][] {
  const map = new Map<string, QueueOrderItem[]>();
  for (const order of orders) {
    const key = order.date.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(order);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
