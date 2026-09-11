"use client";

import { toPng } from "html-to-image";

/** Render a share card node to a PNG file. */
export async function renderCardToFile(node: HTMLElement, filename: string): Promise<File> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  return new File([dataUrlToBlob(dataUrl)], filename, { type: "image/png" });
}

// Deliberately not `fetch(dataUrl)`: fetching a data: URL is governed by the
// Content-Security-Policy `connect-src` directive, which only allows 'self' —
// decoding it by hand avoids depending on that being loosened.
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Render a node to a PNG and either open the share sheet or download it. */
export async function shareOrDownload(node: HTMLElement, filename: string): Promise<"shared" | "downloaded"> {
  const file = await renderCardToFile(node, filename);

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    // Deliberately omit `title`/`text`: some share targets (notably iOS's "Copy"
    // action) write a second clipboard item derived from the accompanying text
    // alongside the image, which then pastes as a duplicate. Sharing the file
    // alone avoids that and still shows fine everywhere the image goes.
    await nav.share({ files: [file] });
    return "shared";
  }

  downloadFile(file);
  return "downloaded";
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
