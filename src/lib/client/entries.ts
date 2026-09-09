"use client";

import { mutate } from "swr";

/** Revalidate every cached /api/entries query plus dependent resources. */
export function refreshEntries(): Promise<unknown> {
  return Promise.all([
    mutate((key) => typeof key === "string" && key.startsWith("/api/entries")),
    mutate("/api/settlements"),
    mutate("/api/persons"),
    mutate((key) => typeof key === "string" && key.startsWith("/api/persons/")),
  ]);
}
