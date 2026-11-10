# Running Regibee

These notes are for anyone changing or running the live app, people and Claude alike. The [README](README.md) covers local setup.

## Where each part runs

| Service | What it does | What to know |
| --- | --- | --- |
| GitHub `dango-design/regibee` | Code, pull requests, CI | CI reads the `CHROMATIC_PROJECT_TOKEN` repo secret. |
| Vercel | Builds and hosts the site | `main` deploys to regibee.com and www.regibee.com. Every other branch gets a preview URL. Every deployment URL except regibee.com needs a Vercel login. |
| Supabase `regibee` (ref `ibfvmgpfwhhyrhnxaxig`) | Database and sign-in | This is the only database. Preview deploys and `vercel env pull` use it too, so anything you do on a preview or locally with those keys changes real data. Database changes are run by hand. See below. |
| Resend | Sends notification emails from `notifications@regibee.com` | Needs `RESEND_API_KEY`, and DNS records for regibee.com. |
| Porkbun | Registrar and DNS for regibee.com | The DNS records point the site at Vercel and verify the domain for Resend. |
| Chromatic | Visual tests of the Storybook stories | The project is in the `dango-design` Chromatic account, on the free plan. Its id is in `chromatic.config.json`. |

Vercel holds these env vars for production, preview and development: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL`. Run `vercel env pull .env.local` to copy them to your machine.

## Database changes

- Changes live in `supabase/migrations`. Nothing runs them on deploy. Someone runs each new file by hand.
- Production has no migration history table, so the Supabase CLI can't tell which files have run. Look at the database before running a file.
- Give a new file the next number after the highest one. Two files already share `009`.
- There's no staging database, so read a new file closely before running it on production. Use the SQL Editor in the Supabase dashboard, or the Supabase CLI (version 3 or later, `brew install supabase/tap/supabase`):

  ```bash
  supabase login
  supabase link --project-ref ibfvmgpfwhhyrhnxaxig
  supabase db query --remote -f supabase/migrations/<file>.sql
  ```

  `--remote` runs the file on the linked project, and the CLI asks you to confirm first. Without it, `db query` runs against a local database. The older `--linked` flag still works in CLI 3 but is deprecated and goes away in v4.

- If a migration takes away access that the live code still uses, deploy the code first and run the migration after. Run the other way round, and the live site breaks until the code is deployed. `009_restrict_registry_reads.sql` was one of these.
- To test access rules (RLS) on production without saving anything, put the test in a `DO` block. Set `local role` and `request.jwt.claims` inside it, run the queries, and end the block with `raise exception` so everything rolls back.

## Keys and access rules

- The anon key ships in the browser, so anyone can use it. The table access rules (RLS) are the only thing protecting data the anon key can reach.
- `SUPABASE_SERVICE_ROLE_KEY` skips every access rule. Use the service-role client only in server code, and filter by an id or slug the user is allowed to see. The public registry page (`src/app/r/[slug]/page.tsx`) works this way.

## Visual tests (Chromatic)

- `.github/workflows/chromatic.yml` runs Chromatic on every push. It snapshots only the stories the commit affects.
- Builds on `main` accept their own changes (`autoAcceptChanges: main`). That keeps `main`'s baselines current, even when a PR merges before anyone accepted it.
- Still accept a PR's changes on its branch build before merging. Accepting records that someone reviewed them, and turns the PR's "UI Tests" check green. The Accept and merge button that follows the review page does both steps.
- On a branch build, accept only the changes that branch made.
- Merging before the branch's `chromatic` check finishes is fine. It can cost extra snapshots, but development speed matters more.
- The free plan includes 5,000 snapshots a month. When they run out, Chromatic pauses testing and review until the next month.
- Storybook can't render async server components. Put a page's markup in a plain component and write the story for that. The landing page works this way.

## Browser extension

- The Chrome extension lives in `extension/`. [extension/README.md](extension/README.md) covers building, loading and what it reads.
- It signs in with its own Supabase session, which `/extension/connect` creates. Its API is `src/app/api/extension/*`, and it runs as the signed-in user under the same access rules as the website.
- Store link rules and the pages it reads are in `src/lib/retailers.ts`, which the site and the extension share. Change a store there, not in the extension.
- The extension only works against a site that has its API routes deployed.
- `npm run test:extension` runs the built extension in Playwright's Chromium on saved copies of real store pages, with Regibee's API stubbed. The pages hold the owner's real registries, so they stay outside the repo, in `~/.regibee/extension-test-pages`. Never commit them. GitHub Actions doesn't run these tests, since it has no pages.

## Before opening a pull request

- Run `npx tsc --noEmit` and `npm run build`.
- If you changed components or stories, also run `npm run build-storybook`.
- If you changed `extension/`, `src/lib/retailers.ts` or `src/lib/extension.ts`, also run `npm run extension:build` and `npm run test:extension`. The tests skip when this computer has no saved store pages. See "Tests" in [extension/README.md](extension/README.md).
- `npm run lint` fails right now. `eslint.config.mjs` imports `eslint-plugin-storybook`, which isn't in `package.json`.

## After opening a pull request

- When the PR's `chromatic` and `Vercel` checks finish, publish a review page with the `pr-review-page` skill (`.claude/skills/pr-review-page`) and give the user the link. End that turn with an Accept and merge button. The skill says how to set it up and what to do when the user clicks it.
