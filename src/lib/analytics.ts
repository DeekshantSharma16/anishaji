/**
 * Provider-agnostic event helper. Works with Plausible or GA4 if either is
 * present, and is a no-op otherwise, so nothing breaks before you pick one.
 * Add the Plausible script tag in src/routes/__root.tsx head links to enable.
 */
type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
    gtag?: (command: string, event: string, params?: Props) => void;
  }
}

export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, { props });
    window.gtag?.("event", event, props);
  } catch {
    // Analytics must never take the page down.
  }
}

export const events = {
  bookingStarted: "booking_started",
  bookingSubmitted: "booking_submitted",
  bookingFailed: "booking_failed",
  bookingRescheduled: "booking_rescheduled",
  bookingCancelled: "booking_cancelled",
  quizCompleted: "quiz_completed",
  leadCaptured: "lead_captured",
  whatsappClicked: "whatsapp_clicked",
  calendarAdded: "calendar_added",
} as const;
