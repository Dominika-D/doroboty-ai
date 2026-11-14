import { describe, expect, it } from "vitest";
import {
  contributionNotifications,
  contributionState,
  emptyContribution,
  filterByContribution,
  initialState,
  sortApplications,
  stateSchema,
  transition,
  type Contribution,
  type State,
} from "./model";

const time = "2026-11-14T10:00:00.000Z";
const card: Contribution = {
  problem: "Ręczne przypisywanie zgłoszeń w zespole obsługi. Narzędzia: GPT i Zendesk.",
  own: "Sama przeprowadziłam rozmowy i testy. Integrację napisał programista.",
  decision: "Model tylko proponuje kategorię. Konsultant ją zatwierdza.",
  result: "Czas przypisania spadł z 6 do 2 minut. Korzysta 38 osób.",
};
function as(state: State, id: string) {
  return transition(state, { type: "select_person", id });
}
function submit(contribution?: Contribution) {
  const s = as(initialState(), "candidate-anna");
  return transition(
    s,
    {
      type: "submit",
      jobId: s.jobs[0].id,
      notes: "",
      generated: "",
      answer: "Approved application with sufficient context.",
      consent: true,
      contribution,
    },
    time,
    "application-anna",
  );
}
const anna = (s: State) => s.applications.find((x) => x.id === "application-anna")!;

describe("candidate contribution card", () => {
  it("seeds ten hidden synthetic candidates, six of them with a card", () => {
    const s = initialState();
    const samples = s.people.filter((x) => x.sample);
    expect(samples).toHaveLength(10);
    expect(samples.every((x) => x.role === "candidate")).toBe(true);
    const seeded = s.applications.filter((x) => x.id.startsWith("application-sample-"));
    expect(seeded).toHaveLength(10);
    expect(seeded.filter((x) => x.contribution).length).toBe(6);
    expect(seeded.every((x) => x.companyId === "10000000-0000-4000-8000-000000000001")).toBe(true);
  });

  it("stores a complete card unchanged with a simulated summary", () => {
    const app = anna(submit(card));
    expect(app.contribution).toEqual(card);
    expect(app.contributionSummary).toContain("Sama przeprowadziłam rozmowy i testy.");
    expect(app.contributionSummary).toContain("AI Product Manager");
    expect(app.contributionQuestions).toHaveLength(2);
  });

  it("saves the submitted card in the candidate profile", () => {
    const s = submit(card);
    expect(s.people.find((x) => x.id === "candidate-anna")?.contribution).toEqual(card);
  });

  it("treats an empty card as no card and rejects a partial one", () => {
    expect(anna(submit(emptyContribution)).contribution).toBeUndefined();
    expect(anna(submit()).contribution).toBeUndefined();
    expect(() => submit({ ...card, decision: "  " })).toThrow("wszystkie 4 pytania");
  });

  it("keeps a partial card in a draft", () => {
    const s = as(initialState(), "candidate-anna");
    const next = transition(s, {
      type: "draft",
      jobId: s.jobs[1].id,
      notes: "",
      generated: "",
      answer: "Szkic",
      contribution: { ...emptyContribution, own: "Moja część" },
    });
    expect(next.drafts[0].contribution?.own).toBe("Moja część");
  });

  it("lets the employer request a card once and the candidate answer within 3 days", () => {
    let s = as(submit(), "employer-brightlabs");
    s = transition(s, { type: "request_contribution", applicationId: "application-anna" }, time);
    expect(anna(s).contributionRequestedAt).toBe(time);
    expect(contributionState(anna(s), time)).toBe("waiting");
    expect(() =>
      transition(s, { type: "request_contribution", applicationId: "application-anna" }, time),
    ).toThrow();
    expect(() =>
      transition(
        as(s, "employer-northstar"),
        { type: "request_contribution", applicationId: "application-anna" },
        time,
      ),
    ).toThrow();
    s = as(s, "candidate-anna");
    expect(() =>
      transition(s, {
        type: "add_contribution",
        applicationId: "application-anna",
        contribution: { ...card, result: "" },
      }),
    ).toThrow();
    const answeredAt = "2026-11-15T10:00:00.000Z";
    s = transition(
      s,
      { type: "add_contribution", applicationId: "application-anna", contribution: card },
      answeredAt,
    );
    expect(anna(s).contribution).toEqual(card);
    expect(anna(s).contributionQuestions).toHaveLength(2);
    expect(s.people.find((x) => x.id === "candidate-anna")?.contribution).toEqual(card);
    const notes = contributionNotifications(s, anna(s).companyId, answeredAt);
    expect(notes).toEqual([expect.objectContaining({ kind: "answered", at: answeredAt })]);
    s = transition(
      as(s, "employer-brightlabs"),
      { type: "mark_contribution_seen", applicationId: "application-anna" },
      answeredAt,
    );
    expect(contributionNotifications(s, anna(s).companyId, answeredAt)).toHaveLength(0);
  });

  it("marks a missed deadline as no response and notifies the recruiter", () => {
    let s = as(submit(), "employer-brightlabs");
    s = transition(s, { type: "request_contribution", applicationId: "application-anna" }, time);
    const late = "2026-11-17T10:00:01.000Z";
    expect(contributionState(anna(s), late)).toBe("no_response");
    expect(contributionNotifications(s, anna(s).companyId, late)).toEqual([
      expect.objectContaining({ kind: "no_response", at: "2026-11-17T10:00:00.000Z" }),
    ]);
    expect(() =>
      transition(
        as(s, "candidate-anna"),
        { type: "add_contribution", applicationId: "application-anna", contribution: card },
        late,
      ),
    ).toThrow("Termin");
    const simulated = transition(
      s,
      { type: "expire_contribution_request", applicationId: "application-anna" },
      time,
    );
    expect(contributionState(anna(simulated), time)).toBe("no_response");
  });

  it("filters by card status and sorts by score without dropping anyone", () => {
    const list = initialState().applications.filter(
      (x) => x.companyId === "10000000-0000-4000-8000-000000000001",
    );
    const filled = filterByContribution(list, "filled");
    const unfilled = filterByContribution(list, "unfilled");
    expect(filled.length + unfilled.length).toBe(list.length);
    expect(filled.every((x) => x.contribution)).toBe(true);
    expect(unfilled.every((x) => !x.contribution)).toBe(true);
    const byScore = sortApplications(list, "score");
    expect(byScore[0].score).toBe(Math.max(...list.map((x) => x.score)));
  });

  it("still accepts version-1 saves without the new fields", () => {
    const legacy = structuredClone(initialState());
    legacy.people = legacy.people.filter((x) => !x.sample);
    legacy.applications = legacy.applications
      .filter((x) => !x.id.startsWith("application-sample-"))
      .map(({ contribution, contributionSummary, contributionQuestions, ...rest }) => {
        void contribution;
        void contributionSummary;
        void contributionQuestions;
        return rest;
      });
    expect(stateSchema.safeParse(legacy).success).toBe(true);
  });
});
