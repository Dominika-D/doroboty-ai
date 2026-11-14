import { describe, expect, it } from "vitest";
import e8Data from "./data/e8-scenario.json" with { type: "json" };
import { e8State, showsContribution } from "./model";

describe("recruiter test E8 scenario", () => {
  it.each(["1", "2"] as const)("loads set %s with 10 applications for one job", (set) => {
    const state = e8State(set, "B");
    expect(state.activePersonId).toBe("employer-brightlabs");
    expect(state.applications).toHaveLength(10);
    expect(new Set(state.applications.map((x) => x.jobId)).size).toBe(1);
    expect(state.applications.filter((x) => x.contribution)).toHaveLength(6);
    for (const a of state.applications.filter((x) => x.contribution))
      expect(a.contributionQuestions).toHaveLength(2);
    expect(state.testSet).toBe(set);
  });

  it("hides contribution features only in variant A", () => {
    expect(showsContribution(e8State("1", "A"))).toBe(false);
    expect(showsContribution(e8State("1", "B"))).toBe(true);
    expect(showsContribution({})).toBe(true);
  });

  it("does not ship company decisions to the participant", () => {
    const text = JSON.stringify(e8Data);
    expect(text).not.toMatch(/continue|reject|post_interview/);
  });
});
