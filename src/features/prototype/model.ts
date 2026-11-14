import { z } from "zod";
import marketplace from "./data/marketplace.json" with { type: "json" };
import people from "./data/people.json" with { type: "json" };
import contributionSamples from "./data/contribution-samples.json" with { type: "json" };
import e8Data from "./data/e8-scenario.json" with { type: "json" };
import type { JobWithCompany } from "@/features/jobs/types";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const shortText = z.string().trim().min(1).max(200);
const text = z.string().trim().max(12000);
export const MIN_APPLICATION_ANSWER_LENGTH = 20;
const companySchema = z.object({
  id,
  slug: id,
  name: shortText,
  summary: text,
  description: text,
  websiteUrl: z.string().max(500),
  location: shortText,
  sizeLabel: shortText,
  logoUrl: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional(),
});
export const jobSchema = z
  .object({
    id,
    slug: id,
    companyId: id,
    title: shortText,
    summary: text.min(10),
    description: text.min(30),
    category: z.enum(["build", "apply", "lead"]),
    function: z.enum(["product", "engineering", "data", "design", "marketing", "operations"]),
    remoteStatus: z.enum(["onsite", "hybrid", "remote"]),
    locations: z.array(shortText).min(1).max(10),
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .optional(),
    seniority: z.enum(["junior", "mid", "senior", "lead"]),
    contract: z.enum(["employment", "b2b", "mandate"]),
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    salaryCurrency: z.enum(["PLN", "EUR"]).optional(),
    salaryPeriod: z.enum(["month", "year"]).optional(),
    salaryKind: z.enum(["gross", "net"]).optional(),
    publicationStatus: z.enum(["draft", "review", "published", "hidden", "expired", "archived"]),
    publishedAt: z.iso.datetime(),
    expiryAt: z.iso.datetime(),
    verificationStatus: z.enum(["unverified", "editorial", "employer_verified"]),
    sourceBrief: text.optional(),
    generatedDescription: text.optional(),
  })
  .refine(
    (job) =>
      job.salaryMin === undefined || job.salaryMax === undefined || job.salaryMin <= job.salaryMax,
    { path: ["salaryMax"], message: "Salary maximum must not be below minimum" },
  );
export const profileSchema = z.object({
  name: shortText,
  headline: shortText,
  bio: text,
  location: shortText,
});
const contributionAnswer = z.string().trim().max(3000);
/** Candidate contribution card (I4): four fixed questions, kept exactly as the candidate wrote them. */
export const contributionSchema = z.object({
  problem: contributionAnswer,
  own: contributionAnswer,
  decision: contributionAnswer,
  result: contributionAnswer,
});
export type Contribution = z.infer<typeof contributionSchema>;
export const contributionFields = ["problem", "own", "decision", "result"] as const;
export type ContributionField = (typeof contributionFields)[number];
export const contributionQuestions: Record<ContributionField, string> = {
  problem: "Jaki problem rozwiązywał projekt i jakich narzędzi użyliście?",
  own: "Co było Twoją częścią pracy, a co zrobili inni lub AI?",
  decision: "Jaką decyzję w projekcie podjęłaś lub podjąłeś i dlaczego?",
  result: "Jaki był wynik, kto z niego korzysta i jaki jest status projektu?",
};
export const contributionLabels: Record<ContributionField, string> = {
  problem: "Problem i narzędzia",
  own: "Moja część i część innych",
  decision: "Moja decyzja",
  result: "Wynik, użytkownicy i status",
};
export const emptyContribution: Contribution = { problem: "", own: "", decision: "", result: "" };
export const INCOMPLETE_CONTRIBUTION_MESSAGE =
  "Odpowiedz na wszystkie 4 pytania o wkład albo zostaw tę część pustą.";
/** Returns undefined for an empty card and throws when only some answers are filled. */
export function normalizeContribution(value: Contribution | undefined): Contribution | undefined {
  if (!value) return undefined;
  const card = contributionSchema.parse(value);
  const filled = contributionFields.filter((field) => card[field].length > 0).length;
  if (filled === 0) return undefined;
  if (filled < contributionFields.length) throw new Error(INCOMPLETE_CONTRIBUTION_MESSAGE);
  return card;
}
const firstSentence = (value: string, max = 180) => {
  const sentence = value.split(/(?<=[.!?])\s/)[0] ?? value;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
};
/** Deterministic stand-in for an AI summary. No model is called. */
export function simulateContributionSummary(card: Contribution, jobTitle: string) {
  const sentences = (value: string, count: number, max: number) =>
    value
      .split(/(?<=[.!?])\s/)
      .slice(0, count)
      .map((sentence) => firstSentence(sentence, max))
      .join(" ");
  return [
    `Projekt: ${firstSentence(card.problem, 240)}`,
    `Własna część: ${sentences(card.own, 2, 240)}`,
    `Kluczowa decyzja: ${firstSentence(card.decision, 240)}`,
    `Efekt: ${sentences(card.result, 2, 200)}`,
    `Oferta: ${jobTitle}.`,
  ].join(" ");
}
/** Deterministic stand-in for two AI interview questions. No model is called. */
export function simulateContributionQuestions(card: Contribution): string[] {
  return [
    `Proszę opowiedzieć krok po kroku, jak powstała ta część pracy: „${firstSentence(card.own, 140)}” Co było zrobione samodzielnie, a co przejęli inni lub AI?`,
    `Jakie inne rozwiązania były brane pod uwagę przy decyzji: „${firstSentence(card.decision, 140)}” Po czym było widać, że to dobry wybór?`,
  ];
}
export const CONTRIBUTION_RESPONSE_DAYS = 3;
const DAY_MS = 86_400_000;
export type ContributionState = "filled" | "waiting" | "no_response" | "missing";
export const contributionStateLabels: Record<ContributionState, string> = {
  filled: "Uzupełnione",
  waiting: "Czeka na odpowiedź",
  no_response: "Brak odpowiedzi",
  missing: "Nieuzupełnione",
};
type ContributionRecord = Pick<
  Application,
  "contribution" | "contributionRequestedAt" | "contributionAddedAt" | "contributionSeenAt"
>;
export function contributionDeadline(application: Pick<Application, "contributionRequestedAt">) {
  return application.contributionRequestedAt
    ? new Date(
        Date.parse(application.contributionRequestedAt) + CONTRIBUTION_RESPONSE_DAYS * DAY_MS,
      ).toISOString()
    : undefined;
}
export function contributionState(
  application: ContributionRecord,
  now = new Date().toISOString(),
): ContributionState {
  if (application.contribution) return "filled";
  const deadline = contributionDeadline(application);
  if (!deadline) return "missing";
  return now > deadline ? "no_response" : "waiting";
}
export type ContributionFilter = "all" | "filled" | "unfilled";
export const contributionFilterOptions: { value: ContributionFilter; label: string }[] = [
  { value: "all", label: "Wszyscy kandydaci" },
  { value: "filled", label: "Uzupełnione" },
  { value: "unfilled", label: "Nieuzupełnione" },
];
export function filterByContribution<T extends ContributionRecord>(
  list: T[],
  filter: ContributionFilter,
) {
  if (filter === "all") return list;
  return list.filter((x) => (x.contribution !== undefined) === (filter === "filled"));
}
export type ContributionNotification = {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  kind: "answered" | "no_response";
  at: string;
};
/** Recruiter notifications derived from requests; opening the application marks them seen. */
export function contributionNotifications(
  state: State,
  companyId: string | undefined,
  now = new Date().toISOString(),
): ContributionNotification[] {
  const result: ContributionNotification[] = [];
  for (const a of state.applications) {
    if (a.companyId !== companyId || !a.contributionRequestedAt) continue;
    const seen = a.contributionSeenAt ?? "";
    const base = { applicationId: a.id, candidateName: a.candidateName, jobTitle: a.jobTitle };
    if (a.contributionAddedAt && seen < a.contributionAddedAt)
      result.push({ ...base, kind: "answered", at: a.contributionAddedAt });
    const deadline = contributionDeadline(a)!;
    if (contributionState(a, now) === "no_response" && seen < deadline)
      result.push({ ...base, kind: "no_response", at: deadline });
  }
  return result.sort((x, y) => y.at.localeCompare(x.at));
}
const personSchema = profileSchema.extend({
  id,
  /** Synthetic candidates used only to populate employer lists; hidden from the person picker. */
  sample: z.boolean().optional(),
  role: z.enum(["candidate", "employer", "operator"]),
  companyId: id.optional(),
  cv: text,
  exampleScore: z.number().int().min(0).max(100),
  exampleSummary: text,
  /** Last contribution card the candidate submitted; prefills the next application. */
  contribution: contributionSchema.optional(),
});
export const stages = [
  "submitted",
  "reviewed",
  "interview_invited",
  "first_conversation_held",
  "continued",
  "rejected",
  "withdrawn",
  "hired",
] as const;
export type Stage = (typeof stages)[number];
export const stageLabels: Record<Stage, string> = {
  submitted: "Aplikacja wysłana",
  reviewed: "W trakcie",
  interview_invited: "Zaproszenie na rozmowę",
  first_conversation_held: "Pierwsza rozmowa odbyta",
  continued: "Kolejny etap",
  rejected: "Proces zakończony",
  withdrawn: "Wycofana",
  hired: "Zatrudnienie",
};
export const nextStages: Record<Stage, Stage[]> = {
  submitted: ["reviewed", "rejected"],
  reviewed: ["interview_invited", "rejected"],
  interview_invited: ["first_conversation_held", "rejected"],
  first_conversation_held: ["continued", "rejected"],
  continued: ["hired", "rejected"],
  rejected: [],
  withdrawn: [],
  hired: [],
};
const applicationSchema = z.object({
  id,
  candidateId: id,
  jobId: id,
  companyId: id,
  jobTitle: shortText,
  candidateName: shortText,
  cv: text.min(20),
  answer: text.min(MIN_APPLICATION_ANSWER_LENGTH),
  sourceNotes: text,
  generatedAnswer: text,
  score: z.number().int().min(0).max(100),
  summary: text,
  contribution: contributionSchema.optional(),
  contributionSummary: text.optional(),
  contributionQuestions: z.array(text).max(2).optional(),
  contributionRequestedAt: z.iso.datetime().optional(),
  contributionAddedAt: z.iso.datetime().optional(),
  contributionSeenAt: z.iso.datetime().optional(),
  stage: z.enum(stages),
  events: z
    .array(z.object({ stage: z.enum(stages), at: z.iso.datetime(), note: text }))
    .min(1)
    .max(30),
});
const draftSchema = z.object({
  candidateId: id,
  jobId: id,
  notes: text,
  generated: text,
  answer: text,
  contribution: contributionSchema.optional(),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    activePersonId: id.nullable(),
    companies: z.array(companySchema).min(1).max(200),
    jobs: z.array(jobSchema).min(1).max(1000),
    people: z.array(personSchema).min(1).max(100),
    applications: z.array(applicationSchema).max(2000),
    saved: z.array(z.object({ candidateId: id, jobId: id })).max(5000),
    drafts: z.array(draftSchema).max(1000),
    /** Recruiter test E8: A hides the contribution card, B shows it. Absent = normal app (B). */
    testVariant: z.enum(["A", "B"]).optional(),
    testSet: z.enum(["1", "2"]).optional(),
  })
  .superRefine((s, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const list of [s.companies, s.jobs, s.people, s.applications]) {
      if (new Set(list.map((x) => x.id)).size !== list.length) problem("Duplicate identifiers");
    }
    if (
      new Set(s.jobs.map((x) => x.slug)).size !== s.jobs.length ||
      new Set(s.companies.map((x) => x.slug)).size !== s.companies.length
    )
      problem("Duplicate slugs");
    const companyIds = new Set(s.companies.map((x) => x.id));
    const jobs = new Map(s.jobs.map((x) => [x.id, x]));
    const candidates = new Set(s.people.filter((x) => x.role === "candidate").map((x) => x.id));
    if (s.activePersonId !== null && !s.people.some((x) => x.id === s.activePersonId))
      problem("Unknown active person");
    for (const p of s.people)
      if (p.role === "employer" && (!p.companyId || !companyIds.has(p.companyId)))
        problem("Unknown employer company");
    for (const j of s.jobs) if (!companyIds.has(j.companyId)) problem("Unknown job company");
    const keys = new Set<string>();
    for (const a of s.applications) {
      const key = `${a.candidateId}:${a.jobId}`;
      if (
        !candidates.has(a.candidateId) ||
        jobs.get(a.jobId)?.companyId !== a.companyId ||
        keys.has(key)
      )
        problem("Invalid application reference");
      keys.add(key);
      if (a.events[0]?.stage !== "submitted" || a.events.at(-1)?.stage !== a.stage)
        problem("Invalid application history");
      for (let i = 1; i < a.events.length; i++) {
        const before = a.events[i - 1];
        const after = a.events[i];
        if (!(
          nextStages[before.stage].includes(after.stage) ||
          (after.stage === "withdrawn" &&
            !["hired", "rejected", "withdrawn"].includes(before.stage))
        ))
          problem("Invalid stage transition");
        if (after.at < before.at) problem("Invalid event order");
      }
    }
    for (const list of [s.saved, s.drafts]) {
      const pairs = new Set<string>();
      for (const item of list) {
        const key = `${item.candidateId}:${item.jobId}`;
        if (!candidates.has(item.candidateId) || !jobs.has(item.jobId) || pairs.has(key))
          problem("Invalid candidate/job reference");
        pairs.add(key);
      }
    }
  });
export type State = z.infer<typeof stateSchema>;
const terminalStages: Stage[] = ["hired", "rejected", "withdrawn"];
/** Drafts may keep a partially filled card; only fully empty cards are dropped. */
function normalizeContributionDraft(card: Contribution) {
  return contributionFields.some((field) => card[field].trim().length > 0);
}
export type Person = State["people"][number];
export type Application = State["applications"][number];
export type Action =
  | { type: "select_person"; id: string | null }
  | { type: "profile"; value: z.infer<typeof profileSchema> }
  | { type: "toggle_saved"; jobId: string }
  | {
      type: "draft";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      contribution?: Contribution;
    }
  | {
      type: "submit";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      consent: boolean;
      contribution?: Contribution;
    }
  | { type: "request_contribution"; applicationId: string }
  | { type: "expire_contribution_request"; applicationId: string }
  | { type: "mark_contribution_seen"; applicationId: string }
  | { type: "add_contribution"; applicationId: string; contribution: Contribution }
  | { type: "stage"; applicationId: string; stage: Stage; note: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "publish"; job: z.infer<typeof jobSchema> }
  | { type: "company"; name: string; description: string };

export function initialState(): State {
  const state = stateSchema.parse({
    version: 1,
    activePersonId: null,
    ...marketplace,
    people: [...people, ...contributionSamples.people],
    applications: [],
    saved: [],
    drafts: [],
  });
  const bob = state.people.find((x) => x.id === "candidate-marek")!;
  const job = state.jobs[0];
  state.applications.push({
    id: "application-example",
    candidateId: bob.id,
    jobId: job.id,
    companyId: job.companyId,
    jobTitle: job.title,
    candidateName: bob.name,
    cv: bob.cv,
    answer:
      "Pracowałem nad automatyzacją obsługi zgłoszeń. Poprowadziłem badania z użytkownikami i wdrożenie, które skróciło czas odpowiedzi o 25%. Chętnie opowiem o decyzjach i ograniczeniach tego projektu.",
    sourceNotes: "",
    generatedAnswer: "",
    score: bob.exampleScore,
    summary: bob.exampleSummary,
    stage: "submitted",
    events: [{ stage: "submitted", at: "2026-11-02T09:00:00.000Z", note: "" }],
  });
  for (const sample of contributionSamples.applications) {
    const candidate = state.people.find((x) => x.id === sample.candidateId)!;
    const sampleJob = state.jobs.find((x) => x.id === sample.jobId)!;
    const events: Application["events"] = [
      { stage: "submitted", at: sample.submittedAt, note: "" },
    ];
    if (sample.stage === "reviewed")
      events.push({
        stage: "reviewed",
        at: new Date(Date.parse(sample.submittedAt) + 86_400_000).toISOString(),
        note: "",
      });
    state.applications.push({
      id: sample.id,
      candidateId: candidate.id,
      jobId: sampleJob.id,
      companyId: sampleJob.companyId,
      jobTitle: sampleJob.title,
      candidateName: candidate.name,
      cv: candidate.cv,
      answer: sample.answer,
      sourceNotes: "",
      generatedAnswer: "",
      score: candidate.exampleScore,
      summary: candidate.exampleSummary,
      ...("contribution" in sample
        ? {
            contribution: sample.contribution,
            contributionSummary: sample.contributionSummary,
            contributionQuestions: sample.contributionQuestions,
          }
        : {}),
      stage: events.at(-1)!.stage,
      events,
    });
  }
  return stateSchema.parse(state);
}
export type ApplicationSort = "newest" | "score";
export const applicationSortOptions: { value: ApplicationSort; label: string }[] = [
  { value: "newest", label: "Najnowsze aplikacje" },
  { value: "score", label: "Match Score: od najwyższego" },
];
function submittedAt(application: { events: { at: string }[] }) {
  return application.events[0]?.at ?? "";
}
/** Sorting only reorders; ties fall back to the submission date. */
export function sortApplications<T extends { score: number; events: { at: string }[] }>(
  list: T[],
  sort: ApplicationSort,
) {
  const byDate = (a: T, b: T) => submittedAt(b).localeCompare(submittedAt(a));
  const byScore = (a: T, b: T) => b.score - a.score || byDate(a, b);
  return [...list].sort(sort === "score" ? byScore : byDate);
}
export type TestSet = "1" | "2";
export type TestVariant = "A" | "B";
/** Whether contribution features are visible (hidden only in test variant A). */
export function showsContribution(state: Pick<State, "testVariant">) {
  return state.testVariant !== "A";
}
/**
 * Test E8 scenario: one set of 10 case applications (June 2026) for one job of the
 * BrightLabs employer persona. Cards come from the candidate's text before the writing
 * assistant; summaries and questions were prepared with an AI model before the test.
 * Company decisions are not part of the app; the moderator keeps them separately.
 */
export function e8State(set: TestSet, variant: TestVariant): State {
  const base = initialState();
  const data = e8Data[set];
  const employer = base.people.find((x) => x.id === "employer-brightlabs")!;
  const company = base.companies.find((x) => x.id === employer.companyId)!;
  employer.headline = `Rekruterka · ${data.company.name}`;
  Object.assign(company, {
    name: data.company.name,
    summary: data.company.summary,
    description: data.company.description,
  });
  const template = base.jobs.find((x) => x.companyId === company.id)!;
  const job = {
    ...template,
    id: `e8-job-${set}`,
    slug: `e8-zestaw-${set}`,
    title: data.job.title,
    summary: `${data.company.summary} Rola z kategorii Lead.`,
    description:
      "Potrzebujemy osoby, która potrafi rozmawiać o swojej dotychczasowej pracy, współpracować z innymi i wyjaśnić decyzje. Nie oczekujemy znajomości wszystkich narzędzi z rynku. Ważne jest rozsądne dobieranie sposobu pracy do problemu. Na rozmowie możemy wrócić do jednego z opisanych projektów.",
    category: "lead" as const,
    remoteStatus: data.job.remoteStatus as "hybrid" | "remote",
    locations: data.job.locations,
    seniority: "mid" as const,
    contract: "b2b" as const,
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: undefined,
    salaryPeriod: undefined,
    salaryKind: undefined,
    publishedAt: "2026-06-01T08:00:00.000Z",
    expiryAt: "2027-06-30T08:00:00.000Z",
  };
  const people = data.applications.map((a) => ({
    id: `candidate-${a.id}`,
    role: "candidate" as const,
    sample: true,
    name: a.name,
    headline: "Kandydat (dane testowe)",
    bio: "Zgłoszenie z danych casu, czerwiec 2026.",
    location: "Polska",
    cv: a.cv,
    exampleScore: a.score,
    exampleSummary: "",
  }));
  const applications: Application[] = data.applications.map((a) => ({
    id: a.id,
    candidateId: `candidate-${a.id}`,
    jobId: job.id,
    companyId: company.id,
    jobTitle: job.title,
    candidateName: a.name,
    cv: a.cv,
    answer: a.answer,
    sourceNotes: "",
    generatedAnswer: "",
    score: a.score,
    summary: "",
    ...("contribution" in a
      ? {
          contribution: a.contribution,
          contributionSummary: a.contributionSummary,
          contributionQuestions: a.contributionQuestions,
        }
      : {}),
    stage: "submitted",
    events: [{ stage: "submitted", at: a.submittedAt, note: "" }],
  }));
  return stateSchema.parse({
    ...base,
    activePersonId: employer.id,
    jobs: [job, ...base.jobs.filter((x) => x.companyId !== company.id)],
    people: [...base.people.filter((x) => !x.sample), ...people],
    applications,
    saved: [],
    drafts: [],
    testVariant: variant,
    testSet: set,
  });
}
export function publishedJobs(state: State): JobWithCompany[] {
  return state.jobs
    .filter((x) => x.publicationStatus === "published")
    .map((job) => ({ ...job, company: state.companies.find((x) => x.id === job.companyId)! }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function currentPerson(state: State) {
  return state.people.find((x) => x.id === state.activePersonId);
}
export function transition(
  state: State,
  action: Action,
  now = new Date().toISOString(),
  newId: string = crypto.randomUUID(),
): State {
  const s = structuredClone(state);
  const person = currentPerson(s);
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const candidate = () => {
    if (person?.role !== "candidate") return fail("Wybierz profil kandydata.");
    return person;
  };
  const employer = () => {
    if (person?.role !== "employer") return fail("Wybierz profil pracodawcy.");
    return person;
  };
  if (action.type === "select_person") {
    if (action.id !== null && !s.people.some((x) => x.id === action.id))
      fail("Nie znaleziono osoby.");
    s.activePersonId = action.id;
  } else if (action.type === "profile")
    Object.assign(candidate(), profileSchema.parse(action.value));
  else if (action.type === "toggle_saved") {
    const p = candidate();
    if (!s.jobs.some((x) => x.id === action.jobId)) fail("Nie znaleziono oferty.");
    const index = s.saved.findIndex((x) => x.candidateId === p.id && x.jobId === action.jobId);
    if (index >= 0) s.saved.splice(index, 1);
    else s.saved.push({ candidateId: p.id, jobId: action.jobId });
  } else if (action.type === "draft") {
    const p = candidate();
    const contribution = action.contribution
      ? contributionSchema.parse(action.contribution)
      : undefined;
    const draft = draftSchema.parse({
      candidateId: p.id,
      jobId: action.jobId,
      notes: action.notes,
      generated: action.generated,
      answer: action.answer,
      ...(contribution && normalizeContributionDraft(contribution) ? { contribution } : {}),
    });
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === action.jobId));
    s.drafts.push(draft);
  } else if (action.type === "submit") {
    const p = candidate();
    const job = s.jobs.find((x) => x.id === action.jobId && x.publicationStatus === "published");
    if (!job) return fail("Oferta nie jest dostępna.");
    if (!action.consent) fail("Zatwierdź treść i zgodę na przesłanie aplikacji.");
    const contribution = normalizeContribution(action.contribution);
    if (s.applications.some((x) => x.candidateId === p.id && x.jobId === job.id))
      fail("Aplikacja na tę ofertę została już wysłana.");
    s.applications.push(
      applicationSchema.parse({
        id: newId,
        candidateId: p.id,
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateName: p.name,
        cv: p.cv,
        answer: action.answer,
        sourceNotes: action.notes,
        generatedAnswer: action.generated,
        score: p.exampleScore,
        summary: p.exampleSummary,
        ...(contribution
          ? {
              contribution,
              contributionSummary: simulateContributionSummary(contribution, job.title),
              contributionQuestions: simulateContributionQuestions(contribution),
            }
          : {}),
        stage: "submitted",
        events: [{ stage: "submitted", at: now, note: "" }],
      }),
    );
    if (contribution) p.contribution = contribution;
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === job.id));
  } else if (action.type === "stage" || action.type === "withdraw") {
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application) return fail("Nie znaleziono aplikacji.");
    const stage = action.type === "withdraw" ? "withdrawn" : action.stage;
    if (action.type === "withdraw") {
      const p = candidate();
      if (
        application.candidateId !== p.id ||
        ["hired", "rejected", "withdrawn"].includes(application.stage)
      )
        fail("Nie można wycofać tej aplikacji.");
    } else {
      const p = employer();
      if (application.companyId !== p.companyId || !nextStages[application.stage].includes(stage))
        fail("Ta zmiana etapu nie jest dostępna.");
    }
    application.stage = stage;
    application.events.push({ stage, at: now, note: action.type === "stage" ? action.note : "" });
  } else if (action.type === "request_contribution") {
    const p = employer();
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application || application.companyId !== p.companyId)
      return fail("Nie znaleziono aplikacji.");
    if (
      application.contribution ||
      application.contributionRequestedAt ||
      terminalStages.includes(application.stage)
    )
      fail("Nie można poprosić o opis wkładu w tej aplikacji.");
    application.contributionRequestedAt = now;
  } else if (
    action.type === "expire_contribution_request" ||
    action.type === "mark_contribution_seen"
  ) {
    const p = employer();
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application || application.companyId !== p.companyId)
      return fail("Nie znaleziono aplikacji.");
    if (action.type === "mark_contribution_seen") application.contributionSeenAt = now;
    else {
      // Prototype-only shortcut so a test session can show the missed deadline without waiting.
      if (contributionState(application, now) !== "waiting")
        fail("Ta prośba nie czeka na odpowiedź.");
      application.contributionRequestedAt = new Date(
        Date.parse(now) - CONTRIBUTION_RESPONSE_DAYS * DAY_MS - 60_000,
      ).toISOString();
    }
  } else if (action.type === "add_contribution") {
    const p = candidate();
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application || application.candidateId !== p.id) return fail("Nie znaleziono aplikacji.");
    if (
      application.contribution ||
      terminalStages.includes(application.stage) ||
      contributionState(application, now) !== "waiting"
    )
      fail("Nie można dodać opisu wkładu do tej aplikacji. Termin na odpowiedź minął.");
    const contribution = normalizeContribution(action.contribution);
    if (!contribution) return fail(INCOMPLETE_CONTRIBUTION_MESSAGE);
    application.contribution = contribution;
    application.contributionSummary = simulateContributionSummary(
      contribution,
      application.jobTitle,
    );
    application.contributionQuestions = simulateContributionQuestions(contribution);
    application.contributionAddedAt = now;
    p.contribution = contribution;
  } else if (action.type === "publish") {
    const p = employer();
    const job = jobSchema.parse(action.job);
    if (job.companyId !== p.companyId) fail("Wybierz ofertę własnej firmy.");
    const index = s.jobs.findIndex((x) => x.id === job.id);
    if (index >= 0) {
      if (s.jobs[index].companyId !== p.companyId) fail("Nie można zmienić tej oferty.");
      s.jobs[index] = job;
    } else s.jobs.unshift(job);
  } else if (action.type === "company") {
    const p = employer();
    Object.assign(
      s.companies.find((x) => x.id === p.companyId)!,
      { name: shortText.parse(action.name), description: text.parse(action.description) },
    );
  }
  return stateSchema.parse(s);
}
