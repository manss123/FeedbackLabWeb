import { measuredSlice } from "@/lib/usage-clock";

export interface UsageContext {
  userId: string;
  browserId: string;
  webSessionId: string;
  tabId: string;
  browserIdPersistent: boolean;
  authTime: string | null;
  deviceCategory: string;
  browserFamily: string;
}
let context: UsageContext | null = null;
let tabId: string;
let previous = 0;
let lastInput = 0;
let visible = false;
let focused = false;
let totals = { visible: 0, active: 0, unobserved: 0 };

export function getUsageContext(uid: string): UsageContext {
  if (context?.userId === uid) return context;
  let browserId = crypto.randomUUID() as string;
  let browserIdPersistent = false;
  try {
    const key = `feedbacklab.browser.${uid}`;
    browserId = localStorage.getItem(key) || browserId;
    localStorage.setItem(key, browserId);
    browserIdPersistent = true;
  } catch {
    /* identity lasts only for this document */
  }
  tabId ??= crypto.randomUUID();
  context = {
    userId: uid,
    browserId,
    browserIdPersistent,
    tabId,
    webSessionId: crypto.randomUUID(),
    authTime: null,
    deviceCategory: /iPad|Tablet/i.test(navigator.userAgent)
      ? "tablet"
      : /Mobile|Android/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop_or_other",
    browserFamily: /Edg/i.test(navigator.userAgent)
      ? "Edge"
      : /Firefox/i.test(navigator.userAgent)
        ? "Firefox"
        : /Chrome|CriOS/i.test(navigator.userAgent)
          ? "Chrome"
          : /Safari/i.test(navigator.userAgent)
            ? "Safari"
            : "other",
  };
  previous = lastInput = performance.now();
  visible = document.visibilityState === "visible";
  focused = document.hasFocus();
  totals = { visible: 0, active: 0, unobserved: 0 };
  return context;
}
export function clearUsageContext() {
  context = null;
}
export function sampleUsage() {
  const now = performance.now();
  const slice = measuredSlice(previous, now, lastInput, visible, focused);
  for (const k of ["visible", "active", "unobserved"] as const) totals[k] += slice[k];
  previous = now;
  return { ...totals, mono: now };
}
export function updateUsageState(input = false) {
  sampleUsage();
  if (input) lastInput = performance.now();
  visible = document.visibilityState === "visible";
  focused = document.hasFocus();
}
export function usageState() {
  return { visible, focused, idle: performance.now() - lastInput >= 60_000 };
}
