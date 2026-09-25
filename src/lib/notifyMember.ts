import "server-only";
import { SettingsModel } from "@/models/Settings";
import { publishOrderUpdate } from "@/lib/ably";
import { sendPushToPerson } from "@/lib/push";

export interface OrderNotice {
  personId: string;
  /** Push body; omit to only refresh the member's open tab (no push). */
  body?: string;
}

/** The one place order changes reach members: each person's open tab refetches live (Ably), and
 * anyone with a `body` also gets a phone push, since they may not have the app open at all.
 * Entirely best-effort — every failure is logged and swallowed, so a notification problem never
 * undoes or fails the order change that triggered it. Pass `title` when the caller already has
 * the mess name, to skip looking it up. */
export async function notifyOrderChange(notices: OrderNotice[], title?: string): Promise<void> {
  const pushes = notices.filter((n): n is Required<OrderNotice> => Boolean(n.body));
  const pushTitle =
    pushes.length === 0 || title
      ? title
      : ((await SettingsModel.findOne({ key: "singleton" }, { messName: 1 }).lean().catch(() => null))
          ?.messName ?? undefined);

  await Promise.all([
    ...[...new Set(notices.map((n) => n.personId))].map((id) => publishOrderUpdate(id)),
    ...pushes.map((n) =>
      sendPushToPerson(n.personId, { title: pushTitle || "Messy", body: n.body, url: "/order" }).catch((err) =>
        console.error("Push send failed:", err),
      ),
    ),
  ]);
}
