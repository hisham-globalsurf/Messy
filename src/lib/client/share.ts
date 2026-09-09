"use client";

import { toPng } from "html-to-image";

/** Render a node to a PNG and either open the share sheet or download it. */
export async function shareOrDownload(node: HTMLElement, filename: string): Promise<"shared" | "downloaded"> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: filename.replace(/\.png$/, "") });
    return "shared";
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
  return "downloaded";
}
