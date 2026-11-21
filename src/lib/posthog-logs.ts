import posthog from "posthog-js";
import { analyticsEnabled, type AnalyticsProperties } from "./analytics";

/** Sends only purpose-written application logs to PostHog; existing console logs remain local. */
export const posthogLog = {
  info(message: string, attributes: AnalyticsProperties) {
    if (analyticsEnabled) posthog.logger.info(message, attributes);
  },
  error(message: string, attributes: AnalyticsProperties) {
    if (analyticsEnabled) posthog.logger.error(message, attributes);
  },
};
