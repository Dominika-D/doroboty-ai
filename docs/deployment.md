# Deployment, checks and rollback

DoRoboty.ai is a static frontend (no server, no database). It is published on Vercel for the owner and the AIPH course instructor only. All data is synthetic and lives in each visitor's browser.

## Owner

Dominika Belina owns the published site. She reacts when it does not work; the instructor reports problems directly to her.

## Publish on Vercel

1. Push the branch you want to publish to GitHub (production branch: `main`).
2. In Vercel: **Add New → Project**, import the `doroboty-ai` repository.
3. Settings: Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`, Install Command `npm ci`.
4. Node.js: `package.json` requires `>=24 <27`, which Vercel uses over the project setting. Choose **24.x** in Settings → Build and Deployment → Node.js Version as well.
5. Environment variables for PostHog analytics (Settings → Environment Variables, Production and Preview):
   - `VITE_POSTHOG_KEY`: the Project API key from PostHog → Settings → Project (starts with `phc_`). It is a public browser key, not a secret.
   - `VITE_POSTHOG_HOST`: `https://eu.i.posthog.com` (the project is in PostHog Cloud EU).
     Vite writes them into the build, so after adding or changing them choose **Redeploy**. Without them the site works and sends nothing. Do not add any other secrets.
6. Every new push to `main` publishes automatically. Run `./scripts/verify` before pushing.

## Check right after publishing (about 5 minutes)

Open the production address in a private browser window, then:

1. The home page with job offers loads and shows logos and the illustration.
2. Choose a candidate (Anna or Marek), open an offer and submit an application.
3. Switch to the employer (Karolina or Tomasz), open the application and record a decision.
4. Reload the page: the application and the decision are still there.
5. The address starts with `https://` and the browser shows no security warning.
6. PostHog → Activity → Live shows a `$pageview` and, after clicking "Zapisz ofertę" on a job card, an `$autocapture` click and `job_saved`.

If any step fails, roll back (below) and note what happened.

## Roll back to the previous version

On Vercel every deployment is kept, so going back needs no rebuild:

1. Open the project in Vercel and choose **Instant Rollback** on the Production Deployment tile (or **Deployments → ⋯ → Instant Rollback** on an earlier deployment).
2. Confirm. The previous version is live within seconds.
3. After a rollback, new pushes do not go live automatically. When the fix is ready, open the new deployment and choose **Promote**.

There is no server-side data, so a rollback never loses data. Visitors' browser data stays in their browsers.

## When the site does not work

1. Check whether the problem is the site or Vercel: open the Vercel dashboard and look at the latest deployment status and build log.
2. If the latest deployment broke the site, roll back (above).
3. If Vercel itself is unavailable and a demo is due, run the app locally (`npm ci`, `npm run dev`, open http://127.0.0.1:3001).
4. After recovery, repeat the 5-minute check.

Sources: Vercel docs on [Instant Rollback](https://vercel.com/docs/instant-rollback) and [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), checked 19 Nov 2026.
