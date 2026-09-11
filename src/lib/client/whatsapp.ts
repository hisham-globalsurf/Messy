"use client";

import { downloadFile, renderCardToFile } from "./share";

export type WhatsAppShareResult = "shared" | "clipboard" | "downloaded";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function chatUrl(phone: string | undefined): string {
  return phone ? `https://web.whatsapp.com/send?phone=${normalizePhone(phone)}` : "https://web.whatsapp.com/";
}

/**
 * Render a share card and hand it to WhatsApp.
 * Mobile (Web Share supports files): the OS share sheet opens with the image
 * already attached — the user just picks WhatsApp, then the contact.
 * Desktop (no file-capable Web Share): the image is copied to the clipboard
 * and that person's chat opens directly — the user pastes (Ctrl/Cmd+V) and sends.
 * If clipboard image writes aren't supported either, the image downloads instead.
 */
export async function shareToWhatsApp(node: HTMLElement, filename: string, phone: string | undefined): Promise<WhatsAppShareResult> {
  const file = await renderCardToFile(node, filename);

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
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
