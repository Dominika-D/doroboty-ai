# PostHog browser analytics

## Intent

AIPH course task: add the PostHog browser library so the published prototype sends page views, Autocapture clicks and a small set of named product events to PostHog Cloud EU. Autocapture must skip places where people type or see private candidate information. The setup wizard opened PR #1; this task reviews and corrects it before merging.

## Acceptance criteria

- `posthog-js` initializes only when `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` are set at build time. Without them the app runs unchanged, sends nothing and `npm run dev` does not fail.
- Autocapture stays on. Containers with candidate names, profiles, application answers, contribution cards, CVs, recruiter notes and the application/profile forms carry `ph-no-capture`, which also hides them from session recordings.
- Named events carry only IDs, categories, stages and booleans; never names, free text, CV content or notes.
- `identify` sends the synthetic persona ID and role only.
- One shared module (`src/lib/analytics.ts`) owns configuration; feature code does not repeat environment checks.
- No unrelated behavior changes from the wizard (the "Zmień osobę" sign-out change is reverted).
- FEATURES.md (SYS-03), docs/deployment.md and `.env.example` describe the actual behavior and Vercel variables.
- `./scripts/verify` runs; failures are reported as they are.

## Status

Implemented on branch `posthog/wizard-01a1fd97ce89` (PR #1), on top of the PostHog wizard commit. Not yet merged or deployed.

## Review of the wizard commit

Kept: posthog-js, named product events, exception capture and purpose-written logs. Changed: one shared `src/lib/analytics.ts` instead of an environment check copied into nine files; `npm run dev` no longer throws without PostHog variables; `identify` no longer sends the persona name; explicit `history_change` page views for hash routes; `ph-no-capture` on private containers. Removed: `@posthog/react` provider and second error boundary (unused; the existing boundary already reports exceptions) and the unrelated change that made "Zmień osobę" clear the active persona. Restored the error-boundary comment and de-duplicated `.gitignore`; `.env.example` is now tracked.

## Verification

- Local machine has Node.js 22.23.5, not 24. Passed: format check, lint, types, 42 unit tests (including the new mocked-client analytics tests), baseline packet validation and production build. The kit integrity part of `design-system:check` passed; its example check refuses to run on Node 22.
- Browser journeys (`npm run test:e2e`) did not run: no Playwright Chromium is provisioned on this machine, and the agent rules forbid installing it. CI must run them.
- Event delivery to PostHog is not verified until Vercel has the variables and the merged build is deployed (see docs/deployment.md, check 6).
