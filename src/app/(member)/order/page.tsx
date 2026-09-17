"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { OrderForm, type OrderDraft } from "@/components/feature/member/order-form";
import { OrderConfirmedNotice } from "@/components/feature/member/order-confirmed-notice";
import { PairedNotice } from "@/components/feature/member/paired-notice";
import { CutoffPanel } from "@/components/feature/member/cutoff-panel";
import { CountdownBadge } from "@/components/feature/member/countdown-badge";
import { MarqueeBanner } from "@/components/feature/member/marquee-banner";
import { PushSubscribeButton } from "@/components/feature/member/push-subscribe-button";
import { MessClosedNotice } from "@/components/feature/member/mess-closed-notice";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMemberName } from "@/components/feature/member/member-session-context";
import { ListSkeleton } from "@/components/feature/states";
import { mutateApi } from "@/lib/client/fetcher";
import { useMemberOrders, useMemberSettings, type MemberOrders } from "@/lib/client/hooks";
import { useScheduledRerender } from "@/lib/client/useScheduledRerender";
import { isPastCutoffToday, msUntilIstTime, postCutoffOrderStage } from "@/lib/cutoff";
import { isMessClosedOn } from "@/lib/messClosure";
import { formatDate } from "@/lib/format";
import type { QueueOrderItem } from "@/types";

export default function MemberOrderPage() {
  const memberName = useMemberName();
  const { data: settings, isLoading: settingsLoading } = useMemberSettings();
  const { data: orders, isLoading: ordersLoading, error } = useMemberOrders();
  const [revealTomorrow, setRevealTomorrow] = useState(false);
  // On phone, the tomorrow order lives in a bottom drawer opened via a thumb-reachable
  // fixed button, separate from revealTomorrow (which also drives the desktop inline reveal) so
  // the drawer can be reopened after closing without re-triggering the desktop layout.
  const [tomorrowSheetOpen, setTomorrowSheetOpen] = useState(false);
  const [saving, setSaving] = useState<"today" | "tomorrow" | null>(null);
  const [deleting, setDeleting] = useState<"today" | "tomorrow" | null>(null);
  // pastCutoff/todayStage below are pure clock checks, not derived from fetched data — without
  // this, an already-open tab wouldn't flip from the order form to the cutoff/confirmed view
  // until something else (a refocus, an unrelated Ably event) happened to trigger a re-render.
  // Scheduled for the exact moment each passes rather than polled, so it's both instant and idle
  // the rest of the day.
  useScheduledRerender(
    settings ? [msUntilIstTime(settings.orderCutoffTime), msUntilIstTime(settings.orderConfirmedUntilTime)] : [],
  );

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
  const tomorrowLabel = `Tomorrow — ${formatDate(orders.tomorrowDate)}`;
  const todayStage = postCutoffOrderStage(settings.orderConfirmedUntilTime);

  function openTomorrowSheet() {
    setRevealTomorrow(true);
    setTomorrowSheetOpen(true);
  }

  async function submit(key: "today" | "tomorrow", date: string, draft: OrderDraft) {
    setSaving(key);
    try {
      // The POST response is the freshly-saved document itself — write it straight into the
      // SWR cache instead of paying for a second round-trip just to re-fetch what we already
      // know, so the UI updates the instant the save actually completes.
      const updated = await mutateApi<QueueOrderItem>("/api/member/order", "POST", {
        date,
        kind: draft.kind,
        variant: draft.variant,
        count: draft.count,
        partnerName: draft.partnerName ?? undefined,
      });
      await globalMutate<MemberOrders>(
        "/api/member/order",
        (current) => (current ? { ...current, [key]: { status: "pending", order: updated } } : current),
        { revalidate: false },
      );
      toast.success("Order placed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSaving(null);
    }
  }

  async function remove(key: "today" | "tomorrow") {
    const status = orders![key];
    if (status.status !== "pending") return;
    setDeleting(key);
    try {
      await mutateApi(`/api/member/order/${status.order._id}`, "DELETE");
      await globalMutate<MemberOrders>(
        "/api/member/order",
        (current) => (current ? { ...current, [key]: { status: "none" } } : current),
        { revalidate: false },
      );
      toast.success("Order removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove order");
    } finally {
      setDeleting(null);
    }
  }

  const tomorrowContent =
    orders.tomorrow.status === "confirmed" ? (
      <OrderConfirmedNotice order={orders.tomorrow.order} dateLabel={tomorrowLabel} />
    ) : orders.tomorrow.status === "paired" ? (
      <PairedNotice partnerName={orders.tomorrow.order.partnerName} dateLabel={tomorrowLabel} isTomorrow />
    ) : (
      <OrderForm
        key={orders.tomorrowDate}
        dateLabel={tomorrowLabel}
        variants={settings.foodVariants}
        pricePerMeal={settings.pricePerMeal}
        currency={settings.currency}
        existing={orders.tomorrow.status === "pending" ? orders.tomorrow.order : null}
        lastOrder={orders.lastOrder}
        cutoffTime={settings.orderCutoffTime}
        memberName={memberName}
        onSubmit={(draft) => submit("tomorrow", orders.tomorrowDate, draft)}
        onDelete={() => remove("tomorrow")}
        saving={saving === "tomorrow"}
        deleting={deleting === "tomorrow"}
      />
    );

  return (
    <div className="space-y-4">
      <MarqueeBanner />

      {orders.today.status === "confirmed" ? (
        <>
          <OrderConfirmedNotice order={orders.today.order} dateLabel="Today" stage={todayStage} />
          {pastCutoff && !showTomorrow && (
            <div className="hidden justify-center sm:flex">
              <Button onClick={() => setRevealTomorrow(true)}>Order for tomorrow</Button>
            </div>
          )}
        </>
      ) : orders.today.status === "paired" ? (
        <>
          <PairedNotice partnerName={orders.today.order.partnerName} dateLabel="Today" isTomorrow={false} />
          {pastCutoff && !showTomorrow && (
            <div className="hidden justify-center sm:flex">
              <Button onClick={() => setRevealTomorrow(true)}>Order for tomorrow</Button>
            </div>
          )}
        </>
      ) : pastCutoff ? (
        <CutoffPanel
          showTomorrowButton={!showTomorrow}
          onOrderTomorrow={() => setRevealTomorrow(true)}
          orderStage={orders.today.status === "pending" ? todayStage : null}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <CountdownBadge cutoffTime={settings.orderCutoffTime} reminderMinutes={settings.orderReminderMinutes} />
          </div>
          <OrderForm
            key={orders.todayDate}
            dateLabel="Today"
            variants={settings.foodVariants}
            pricePerMeal={settings.pricePerMeal}
            currency={settings.currency}
            existing={orders.today.status === "pending" ? orders.today.order : null}
            lastOrder={orders.lastOrder}
            cutoffTime={settings.orderCutoffTime}
            memberName={memberName}
            onSubmit={(draft) => submit("today", orders.todayDate, draft)}
            onDelete={() => remove("today")}
            saving={saving === "today"}
            deleting={deleting === "today"}
          />
        </>
      )}

      {showTomorrow && <div className="hidden sm:block">{tomorrowContent}</div>}

      {/* Phone only: a thumb-reachable fixed button (bottom-right, within easy thumb reach while
          holding the phone one-handed) that opens tomorrow's order card as a bottom drawer,
          instead of the desktop inline reveal above. */}
      {pastCutoff && (
        <button
          type="button"
          onClick={openTomorrowSheet}
          aria-label="Order for tomorrow"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg sm:hidden"
        >
          <CalendarPlus className="size-4" />
          Tomorrow
        </button>
      )}

      <Sheet open={tomorrowSheetOpen} onOpenChange={setTomorrowSheetOpen}>
        <SheetContent side="bottom" className="mx-auto flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-t-2xl sm:hidden">
          <SheetHeader>
            <SheetTitle>{tomorrowLabel}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{tomorrowContent}</div>
        </SheetContent>
      </Sheet>

      <div className="flex justify-center pt-2">
        <PushSubscribeButton />
      </div>
    </div>
  );
}
