"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { OrderForm, type OrderDraft } from "@/components/feature/member/order-form";
import { OrderConfirmedNotice } from "@/components/feature/member/order-confirmed-notice";
import { PairedNotice } from "@/components/feature/member/paired-notice";
import { CutoffPanel } from "@/components/feature/member/cutoff-panel";
import { CountdownBadge } from "@/components/feature/member/countdown-badge";
import { MarqueeBanner } from "@/components/feature/member/marquee-banner";
import { PushSubscribeButton } from "@/components/feature/member/push-subscribe-button";
import { MessClosedNotice } from "@/components/feature/member/mess-closed-notice";
import { useMemberName } from "@/components/feature/member/member-session-context";
import { ListSkeleton } from "@/components/feature/states";
import { mutateApi } from "@/lib/client/fetcher";
import { useMemberOrders, useMemberSettings, type MemberOrders } from "@/lib/client/hooks";
import { isPastCutoffToday } from "@/lib/cutoff";
import { isMessClosedOn } from "@/lib/messClosure";
import { formatDate } from "@/lib/format";
import type { QueueOrderItem } from "@/types";

export default function MemberOrderPage() {
  const memberName = useMemberName();
  const { data: settings, isLoading: settingsLoading } = useMemberSettings();
  const { data: orders, isLoading: ordersLoading, error } = useMemberOrders();
  const [revealTomorrow, setRevealTomorrow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (settingsLoading || ordersLoading || !settings || !orders) {
    return (
      <div className="space-y-4">
        <MarqueeBanner />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Could not load your orders.</p>;
  }

  if (isMessClosedOn(orders.todayDate, settings.messClosedFrom, settings.messClosedTo)) {
    return (
      <MessClosedNotice
        from={settings.messClosedFrom!}
        to={settings.messClosedTo!}
        message={settings.messClosedMessage}
      />
    );
  }

  const pastCutoff = isPastCutoffToday(settings.orderCutoffTime);
  const showTomorrow = pastCutoff && (revealTomorrow || orders.tomorrow.status !== "none");
  const activeDate = showTomorrow ? orders.tomorrowDate : orders.todayDate;
  const activeKey = showTomorrow ? "tomorrow" : "today";
  const activeStatus = showTomorrow ? orders.tomorrow : orders.today;
  const activeLabel = showTomorrow ? `Tomorrow — ${formatDate(orders.tomorrowDate)}` : "Today";

  async function submit(draft: OrderDraft) {
    setSaving(true);
    try {
      // The POST response is the freshly-saved document itself — write it straight into the
      // SWR cache instead of paying for a second round-trip just to re-fetch what we already
      // know, so the UI updates the instant the save actually completes.
      const updated = await mutateApi<QueueOrderItem>("/api/member/order", "POST", {
        date: activeDate,
        kind: draft.kind,
        variant: draft.variant,
        count: draft.count,
        partnerName: draft.partnerName ?? undefined,
      });
      await globalMutate<MemberOrders>(
        "/api/member/order",
        (current) => (current ? { ...current, [activeKey]: { status: "pending", order: updated } } : current),
        { revalidate: false },
      );
      toast.success("Order saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (activeStatus.status !== "pending") return;
    setDeleting(true);
    try {
      await mutateApi(`/api/member/order/${activeStatus.order._id}`, "DELETE");
      await globalMutate<MemberOrders>(
        "/api/member/order",
        (current) => (current ? { ...current, [activeKey]: { status: "none" } } : current),
        { revalidate: false },
      );
      toast.success("Order removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove order");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <MarqueeBanner />

      {pastCutoff && !showTomorrow ? (
        <CutoffPanel showTomorrowButton onOrderTomorrow={() => setRevealTomorrow(true)} />
      ) : activeStatus.status === "confirmed" ? (
        <OrderConfirmedNotice order={activeStatus.order} dateLabel={activeLabel} />
      ) : activeStatus.status === "paired" ? (
        <PairedNotice
          partnerName={activeStatus.order.partnerName}
          dateLabel={activeLabel}
          isTomorrow={showTomorrow}
        />
      ) : (
        <>
          {pastCutoff ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
              Today&apos;s ordering window is closed — this is for tomorrow.
            </p>
          ) : (
            <div className="flex justify-end">
              <CountdownBadge cutoffTime={settings.orderCutoffTime} reminderMinutes={settings.orderReminderMinutes} />
            </div>
          )}
          <OrderForm
            key={activeDate}
            dateLabel={activeLabel}
            variants={settings.foodVariants}
            pricePerMeal={settings.pricePerMeal}
            currency={settings.currency}
            existing={activeStatus.status === "pending" ? activeStatus.order : null}
            lastOrder={orders.lastOrder}
            cutoffTime={settings.orderCutoffTime}
            memberName={memberName}
            onSubmit={submit}
            onDelete={remove}
            saving={saving}
            deleting={deleting}
          />
        </>
      )}

      <div className="flex justify-center pt-2">
        <PushSubscribeButton />
      </div>
    </div>
  );
}
