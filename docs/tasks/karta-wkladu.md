# Candidate contribution card (I4) – clickable prototype for test E8

Slug: `karta-wkladu`
Created: 2026-11-14
Branch: `task/karta-wkladu`

## Goal

Prototype the candidate contribution card ("Mój wkład w projekt") so 5–6 recruiters can compare today's employer panel with a panel that shows the card (test E8).

## Context (from the course discovery, Supersprint week 2)

- Opportunity O01: "Zanim zaproszę kandydata, nie wiem, co zrobił sam, a co jego zespół albo AI."
- Deciding signal S8: the AI assistant removes candidates' own-contribution text (VI 2026: 37.8% → 11.5% of answers; team-part mentions 25.8% → 7.7%).
- Supporting signals: SW1/SW5 (3 of 4 recruiters cannot judge contribution before the interview and ask for a concrete example), S5 (higher invitation and continuation rates for candidates with own contribution).
- Counter-evidence to keep in view: when the assistant removed the text, invitations and continuations did not change (14.7% / 3.80% vs 14.6% / 3.83%). E8 must show whether the card changes recruiter decisions.

## Scope

Candidate side:
- Optional "Mój wkład w projekt" section in the application with 4 fixed questions:
  1. Problem i narzędzia
  2. Co zrobiłem sam, a co inni
  3. Jaką decyzję podjąłem
  4. Wynik, użytkownicy i status
- Contribution text is kept as written (not removed/smoothed by the assistant) and shown as a card on the candidate profile.

Employer side:
- Candidate list sortable by Match Score and by a separate column "Wkład własny: uzupełniony / nieuzupełniony" (sorting, not a filter).
- Card view: full description (to forward to a technical person) and a short simulated AI summary linking it to the job.
- Action "Poproś o opis wkładu" when the card is empty.

Data: 10 synthetic contribution cards based on pre-assistant June 2026 answers (synthetic data only).

## Plan

- [ ] Review relevant code/docs (BRIEF.md, CASE_PROTOCOL, FEATURES.md, design system README)
- [ ] Extend Zod schema and fixtures (keep version-1 saves/imports compatible)
- [ ] Candidate form section
- [ ] Employer list column, sorting, card and request action
- [ ] Add/update tests
- [ ] Run `./scripts/verify`
- [ ] Update FEATURES.md

## Acceptance Criteria

- [ ] Candidate can submit with or without the card; card is clearly optional
- [ ] Employer can sort by Match Score and by contribution status
- [ ] Card shows full text, AI summary (simulated) and the request action when empty
- [ ] Existing saves/imports still load
- [ ] Desktop/mobile and keyboard checks done; Poster People design system followed
- [ ] `./scripts/verify` passes

## Files / Areas

- `src/features/prototype/` (model, data, candidate-application, workspace, recruiting-application)
- `FEATURES.md`, tests

## Risks

- Counter-evidence above: the card may not change decisions.
- Written answers can be "neatly arranged" with AI (D04) – the card does not prove authorship.

## Handoff Notes

Branch created; no code changes yet.
