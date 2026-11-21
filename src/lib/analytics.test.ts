import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthog }));

async function load(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("./analytics");
}

describe("analytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends nothing without PostHog variables", async () => {
    const analytics = await load({ VITE_POSTHOG_KEY: "", VITE_POSTHOG_HOST: "" });
    analytics.initAnalytics();
    analytics.capture("job_saved", { job_id: "job-1" });
    analytics.identifyPersona({ id: "anna", role: "candidate" }, null);
    expect(analytics.analyticsEnabled).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it("initializes once configured and identifies personas by ID and role only", async () => {
    const analytics = await load({
      VITE_POSTHOG_KEY: "phc_test",
      VITE_POSTHOG_HOST: "https://eu.i.posthog.com",
    });
    analytics.initAnalytics();
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ api_host: "https://eu.i.posthog.com" }),
    );

    analytics.identifyPersona(null, null);
    expect(posthog.reset).not.toHaveBeenCalled();

    analytics.identifyPersona({ id: "anna", role: "candidate" }, null);
    expect(posthog.identify).toHaveBeenCalledWith("anna", { role: "candidate" });
    expect(posthog.reset).not.toHaveBeenCalled();

    analytics.identifyPersona({ id: "karolina", role: "employer" }, "anna");
    expect(posthog.reset).toHaveBeenCalledTimes(1);

    analytics.identifyPersona(null, "karolina");
    expect(posthog.reset).toHaveBeenCalledTimes(2);
  });
});
