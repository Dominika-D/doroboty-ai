import posthog from "posthog-js";

/** Only IDs, categories, stages and flags. Never names, free text, CV content or notes. */
export type AnalyticsProperties = Record<string, string | number | boolean>;

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

/** PostHog runs only when both build-time variables are set; otherwise every call is a no-op. */
export const analyticsEnabled = Boolean(key && host);

export function initAnalytics() {
  if (!key || !host) {
    if (import.meta.env.DEV)
      console.info("DoRoboty.ai: PostHog is off (VITE_POSTHOG_KEY / VITE_POSTHOG_HOST not set).");
    return;
  }
  posthog.init(key, {
    api_host: host,
    // Hash routes change through history.pushState, so this records every screen.
    capture_pageview: "history_change",
    person_profiles: "identified_only",
    logs: { serviceName: "doroboty-ai-web", environment: import.meta.env.MODE },
  });
}

export function capture(event: string, properties?: AnalyticsProperties) {
  if (analyticsEnabled) posthog.capture(event, properties);
}

export function captureException(error: Error) {
  if (analyticsEnabled) posthog.captureException(error);
}

/** Links events to the synthetic persona ID and role only. Pass null when nobody is selected. */
export function identifyPersona(
  persona: { id: string; role: string } | null,
  previousId: string | null,
) {
  if (!analyticsEnabled) return;
  if (!persona) {
    if (previousId) posthog.reset();
    return;
  }
  if (previousId && previousId !== persona.id) posthog.reset();
  posthog.identify(persona.id, { role: persona.role });
}
