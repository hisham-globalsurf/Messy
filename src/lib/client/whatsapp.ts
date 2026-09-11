"use client";

import { downloadFile, renderCardToFile } from "./share";

export type WhatsAppShareResult = "shared" | "clipboard" | "downloaded";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function chatUrl(phone: string | undefined): string {
  return phone ? `https://wa.me/${normalizePhone(phone)}` : "https://wa.me/";
}

/**
 * Render a share card and hand it to WhatsApp.
 *
 * WhatsApp never lets a website both auto-select a contact and auto-attach a
 * file — a chat link (web.whatsapp.com/send?phone=...) only accepts prefilled
 * text, never files, so which tradeoff we take depends on whether we have a
 * number for this person:
 * - Known number: that person's chat opens directly (contact auto-selected).
 *   The image is copied to the clipboard so the user just pastes and sends;
 *   if clipboard image writes aren't supported, it downloads instead.
 * - No number (mobile only, Web Share supports files): the OS share sheet
 *   opens with the image already attached — the user picks WhatsApp, then
 *   picks the contact manually there, since we don't know one.
 */
export async function shareToWhatsApp(node: HTMLElement, filename: string, phone: string | undefined): Promise<WhatsAppShareResult> {
  const file = await renderCardToFile(node, filename);

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!phone && nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file] });
    return "shared";
  }

  const url = chatUrl(phone);

  try {
    const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (ClipboardItemCtor && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItemCtor({ [file.type]: file })]);
      window.open(url, "_blank", "noopener,noreferrer");
      return "clipboard";
    }
  } catch {
    // Clipboard write can throw (denied permission, unsupported type) — fall back to download.
  }

  downloadFile(file);
  window.open(url, "_blank", "noopener,noreferrer");
  return "downloaded";
}
