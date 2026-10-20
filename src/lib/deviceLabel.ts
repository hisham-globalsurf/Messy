/** Best-effort "iPhone · Safari" label from a user agent, for the admin to recognise which phone
 * a login request came from. Not a security check — user agents are trivially spoofed; the
 * request's code is what the admin confirms with the member. */
export function deviceLabel(userAgent: string, standalone: boolean): string {
  const ua = userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "Unknown device";
  const browser = /EdgA?\//.test(ua) || /EdgiOS/.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /FxiOS|Firefox/.test(ua)
        ? "Firefox"
        : /CriOS|Chrome/.test(ua)
          ? "Chrome"
          : /Safari/.test(ua)
            ? "Safari"
            : "";
  const app = standalone ? "Home screen app" : browser;
  return app ? `${os} · ${app}` : os;
}
