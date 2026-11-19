# Production-readiness fixes

## Intent

Clear the blockers found by the production-readiness review (19 Nov 2026) before the first Vercel deployment. Deployment itself is a separate, later task.

## Findings and fixes

- `./scripts/verify` failed: 5 of 34 browser tests.
  - 3 tests were outdated after the contribution card (`karta-wkladu`): the application form now has four optional "Wkład własny" fields after the answer, and record sheets have a "Wkład własny" tab between "Odpowiedź" and "CV". Tests now assert the intended order instead of the previous one.
  - Real regression: commit 5cd8d2b removed the effect that moves focus to the updated stage after a recruiter stage change (EMP-09 still promised it). Restored in `recruiting-application.tsx`.
  - Real layout defect: at 320 px the three record tabs overflowed and "CV" was cut off. Tighter tab gap and padding at <=600 px in `records.css`.
- No error screen: a render failure left a blank page. Added `ErrorBoundary` (page-level inside the shell, plus an outer fallback) reusing the existing NotFound composition (section, serif heading, default + outline buttons). FEATURES.md SYS-12 added.

## Acceptance criteria

- [x] `./scripts/verify` passes on Node 24.
- [x] New browser test triggers a simulated render failure at 1280 and 320 px: message, actions, no horizontal overflow, no axe violations, recovery by navigation.
- [x] Error screen and narrow tabs checked visually at desktop and 320 px.
