# Candidate contribution card (I4) – clickable prototype for test E8

Slug: `karta-wkladu`
Created: 2026-11-14
Branch: `task/karta-wkladu`

## Goal

Prototype the candidate contribution card ("Wkład własny") so 5–6 recruiters can compare today's employer panel with a panel that shows the card (test E8).

## Context (from the course discovery, Supersprint week 2)

- Opportunity O01: "Zanim zaproszę kandydata, nie wiem, co zrobił sam, a co jego zespół albo AI."
- Deciding signal S8: the AI assistant removes candidates' own-contribution text (VI 2026: 37.8% → 11.5% of answers; team-part mentions 25.8% → 7.7%).
- Supporting signals: SW1/SW5 (3 of 4 recruiters cannot judge contribution before the interview and ask for a concrete example), S5.
- Counter-evidence: when the assistant removed the text, invitations and continuations did not change (14.7% / 3.80% vs 14.6% / 3.83%). E8 must show whether the card changes recruiter decisions.

## Scope (revised 2026-11-14 by Dominika)

Candidate:

- Optional "Wkład własny" section in the application form with 4 fixed questions (all or none).
- Card is saved in the candidate profile and prefills the next application.

Recruiter:

- Candidate list: Match Score plus a "Wkład własny" status (Uzupełnione / Nieuzupełnione, plus Czeka na odpowiedź / Brak odpowiedzi after a request); filter by it.
- Application "Wkład własny" tab: simulated AI summary of the answers and 2 simulated AI interview questions created at submission; full answers behind a disclosure.
- "Poproś o opis wkładu" when the card is missing, with a 3-day deadline. Recruiter notification when the candidate answers, or when the deadline passes (status "Brak odpowiedzi").

Data: 10 synthetic sample candidates for BrightLabs (6 with a card), hidden from the person picker.

## Decisions and assumptions

- 4 questions, as in decision I4 (the message also mentioned 3; kept 4).
- Filter replaces the earlier sort-by-card idea (D1 said sort); sort by Match Score stays.
- Full answers stay available behind a disclosure for a technical reviewer.
- Notifications are in-app only (candidate list and employer home). A prototype-only button simulates the 3-day deadline for test sessions.
- After the deadline the candidate can no longer answer.

## Acceptance Criteria

- [x] Candidate can submit with or without the card; partial card blocks submission
- [x] Card saved in profile and prefilled next time
- [x] Recruiter sees status tag, filter, summary, 2 questions, full answers
- [x] Request with 3-day deadline, answered / no-response notifications
- [x] Existing version-1 saves/imports still load (new fields optional)
- [ ] Desktop/mobile and keyboard checks in a browser
- [ ] `./scripts/verify` passes (browser journeys not run yet)

## Verification (2026-11-14)

- In a Linux VM copy with Node 22: `tsc --noEmit`, `eslint --max-warnings=0`, Prettier check, 36 unit tests (9 new in `contribution.test.ts`), `npm run build` and `npm run verify:packet` passed.
- Not run: Playwright browser journeys (no provisioned Chromium), visual review at desktop/mobile widths, separate review pass.

## Files / Areas

- `src/features/prototype/` model, data/contribution-samples.json, contribution.tsx, workspace, application-record, candidate-application, recruiting-application
- `src/app/records.css`, `FEATURES.md`, unit tests

## Risks

- The card may not change decisions (counter-evidence above).
- Written answers can be "neatly arranged" with AI (D04); the card does not prove authorship.
- Users with an existing browser save will not see the sample candidates until they reset the scenario in settings.
