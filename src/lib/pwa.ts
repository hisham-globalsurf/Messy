/** Whether the app is currently running installed (added to home screen / standalone window). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iOS Safari never fires `beforeinstallprompt` — it needs the manual Share > Add to Home Screen flow. */
export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
