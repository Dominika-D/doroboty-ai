import posthog from "posthog-js";

type LogAttributes = Record<string, string | number | boolean>;

const posthogLogsEnabled = Boolean(
  import.meta.env.VITE_POSTHOG_KEY && import.meta.env.VITE_POSTHOG_HOST,
);

/** Sends only purpose-written application logs to PostHog; existing console logs remain local. */
export const posthogLog = {
  info(message: string, attributes: LogAttributes) {
    if (posthogLogsEnabled) posthog.logger.info(message, attributes);
  },
  error(message: string, attributes: LogAttributes) {
    if (posthogLogsEnabled) posthog.logger.error(message, attributes);
  },
};
