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
- Make a new file with `supabase migration new <name>`. It names the file with the current time in UTC, like `20261110113500_<name>.sql`, so two branches working at once won't pick the same name. It needs no login or link. Don't pick a number by hand.
- The older files are numbered `001` to `017`. Two pairs share a number, `009` and `015`, from when each branch took the next number after the highest. Run files in name order: that order is right for both pairs, and timestamped files come after `017`.
- The `Migration names` check (`.github/workflows/migrations.yml`) fails a pull request that adds another numbered file or reuses a version. `npm run check:migrations` runs the same check locally.
- There's no staging database, so read a new file closely before running it on production. Use the SQL Editor in the Supabase dashboard, or the Supabase CLI (version 3 or later, `brew install supabase/tap/supabase`):

  ```bash
  supabase login
  supabase link --project-ref ibfvmgpfwhhyrhnxaxig
  supabase db query --remote -f supabase/migrations/<file>.sql
  ```

  `--remote` runs the file on the linked project, and the CLI asks you to confirm first. Without it, `db query` runs against a local database. The older `--linked` flag still works in CLI 3 but is deprecated and goes away in v4.

- If a migration takes away access that the live code still uses, deploy the code first and run the migration after. Run the other way round, and the live site breaks until the code is deployed. `009_restrict_registry_reads.sql` was one of these.
- A new table with foreign keys to two tables that already link to each other gives Supabase's API a second route between them. It then refuses any query that joins the two without naming the link (error `PGRST201`), and pages that use one show nothing. `20261112062733_item_placements.sql` did this to `registries` and `registry_items`, and the dashboard showed "No registries yet" until each join named its link, as in `registry_items!registry_items_registry_id_fkey(...)`. Before running such a migration, name the link in every join between those tables, in the website and in `mobile/src/lib/data.ts`.
- To test access rules (RLS) on production without saving anything, put the test in a `DO` block. Set `local role` and `request.jwt.claims` inside it, run the queries, and end the block with `raise exception` so everything rolls back.

## Keys and access rules

- The anon key ships in the browser, so anyone can use it. The table access rules (RLS) are the only thing protecting data the anon key can reach.
- `SUPABASE_SERVICE_ROLE_KEY` skips every access rule. Use the service-role client only in server code, and filter by an id or slug the user is allowed to see. The public registry page (`src/app/r/[slug]/page.tsx`) works this way.

## Items on several lists

- An item's home list is `registry_items.registry_id`. `registry_item_placements` puts it on more of the same owner's lists, each with its own category. Gifts belong to the item, so they show on every list it's on.
- Only the server reads placements. To list a list's items, use `src/lib/list-items.ts`, not `registry_items` filtered by `registry_id`, or placed items go missing.
- Taking an item off its home list moves it to the next list it's on. Only an item on no other list is deleted. A database trigger does this for direct deletes too, so the phone app and the extension follow the same rule.
- An owner who hides what's been reserved on any list an item is on doesn't see that item's gifts on any of them (`itemsHiddenFromOwner`).

## Visual tests (Chromatic)

- `.github/workflows/chromatic.yml` runs Chromatic on every push. It snapshots only the stories the commit affects.
- Builds on `main` accept their own changes (`autoAcceptChanges: main`). That keeps `main`'s baselines current, even when a PR merges before anyone accepted it.
- Still accept a PR's changes on its branch build before merging. Accepting records that someone reviewed them, and turns the PR's "UI Tests" check green. The Accept and merge button that follows the review page does both steps.
- On a branch build, accept only the changes that branch made.
- Merging before the branch's `chromatic` check finishes is fine. It can cost extra snapshots, but development speed matters more.
- The free plan includes 5,000 snapshots a month. When they run out, Chromatic pauses testing and review until the next month.
- Storybook can't render async server components. Put a page's markup in a plain component and write the story for that. The landing page works this way.

## End-to-end tests

- `e2e/` holds Playwright tests that use the website in a browser and check the emails that follow. [e2e/README.md](e2e/README.md) covers setup.
- They run against local Supabase in Docker (`npm run e2e:db`), never production. Every email, Supabase's own included, lands in local Supabase's Mailpit inbox at http://127.0.0.1:54324.
- `EMAIL_TRANSPORT=mailpit` makes `src/lib/mailer.ts` send to Mailpit instead of Resend. Only the tests set it. Send every email through `src/lib/mailer.ts`, not Resend directly, so tests can catch it.
- `.github/workflows/e2e.yml` runs them on pull requests that change `src/`, `e2e/`, `supabase/`, `package.json` or `next.config.ts`, and on `main`. The check is called **End-to-end tests**. It isn't required yet, so read its result before merging, and don't merge over a failure without knowing why.

## Browser extension

- The Chrome extension lives in `extension/`. [extension/README.md](extension/README.md) covers building, loading and what it reads.
- It signs in with its own Supabase session, which `/extension/connect` creates. Its API is `src/app/api/extension/*`, and it runs as the signed-in user under the same access rules as the website.
- Store link rules and the pages it reads are in `src/lib/retailers.ts`, which the site and the extension share. Change a store there, not in the extension.
- The extension only works against a site that has its API routes deployed.
- `npm run test:extension` runs the built extension in Playwright's Chromium on saved copies of real store pages, with Regibee's API stubbed. The pages hold the owner's real registries, so they stay outside the repo, in `~/.regibee/extension-test-pages`. Never commit them. GitHub Actions doesn't run these tests, since it has no pages.

## Mobile app

- The iPhone and Android app lives in `mobile/`. It's an Expo (React Native) app for registry owners. [mobile/README.md](mobile/README.md) covers what it does, running it and what's left before the app stores.
- It signs in to the same Supabase project and reads and writes the tables directly, as the signed-in user, under the same access rules as the website. It only has the anon key. The one exception is deleting the account, which needs the service-role key: the app calls the website's `/api/account` (on `EXPO_PUBLIC_SITE_URL`, regibee.com by default) with its access token. Like the extension, that only works once the route is deployed there. `mobile/src/lib/data.ts` copies what the website's server actions in `src/lib/actions/registry.ts` do. When you change one, check the other.
- It shares `src/lib/retailers.ts`, `src/lib/demo-data.ts`, `src/lib/gifts.ts` and `src/lib/account-deletion-summary.ts` with the website through the `@shared/*` path. Keep those files free of imports, or the app can't use them.
- Its product reader is built from `extension/src/product-reader.ts`. After changing that file, run `npm run product-reader` in `mobile/`.
- The root `tsconfig.json` leaves out `mobile/`. The app has its own checks.

## Issues and follow-ups

- Track follow-up work as GitHub Issues on `dango-design/regibee` (`gh issue create`): anything a PR leaves out, or an idea for later. Don't leave it only in a chat summary or a review page. A PR that fixes an issue says "Fixes #N" in its description, so merging closes it.
- The repo is public. Anyone can read its issues, pull requests and commit messages. Keep out anything that might not be public:
  - registry, user, purchase and event ids, slugs and invite tokens
  - names, emails and anything else about owners, guests or other accounts
  - real data, such as gift counts or what a registry holds
  - preview and deployment URLs, and links into the Vercel, Supabase, Resend or Chromatic dashboards
  - keys, tokens and env values, even partial ones
  - screenshots of real pages, and text copied from them
- Describe the problem through the code and the pages instead. If you aren't sure something is public, leave it out.

## Before opening a pull request

- Run `npx tsc --noEmit` and `npm run build`.
- If you changed components or stories, also run `npm run build-storybook`.
- If you added a migration, also run `npm run check:migrations`.
- `npm test` runs the unit tests in `src/lib/*.test.ts` with Node's own test runner (the gift exchange name draw, so far). Run it if you changed `src/lib/gift-exchange.ts`.
- If you changed a flow the end-to-end tests cover, emails, `supabase/migrations` or `e2e/`, also run `npm run test:e2e` if Docker is running on this computer. After adding a migration, run `npm run e2e:db` first. Without Docker, the End-to-end tests check on the pull request runs them.
- If you changed `extension/`, `src/lib/retailers.ts` or `src/lib/extension.ts`, also run `npm run extension:build` and `npm run test:extension`. The tests skip when this computer has no saved store pages. See "Tests" in [extension/README.md](extension/README.md).
- If you changed `mobile/`, `src/lib/retailers.ts`, `src/lib/demo-data.ts`, `src/lib/gifts.ts`, `src/lib/account-deletion-summary.ts` or `extension/src/product-reader.ts`, also run `npm run lint` and `npm run check` in `mobile/`.
- `npm run lint` fails right now. `eslint.config.mjs` imports `eslint-plugin-storybook`, which isn't in `package.json`.

## After opening a pull request

- When the PR's `chromatic`, `Vercel` and `End-to-end tests` checks finish (the last runs only on pull requests that change the site), publish a review page with the `pr-review-page` skill (`.claude/skills/pr-review-page`) and give the user the link. End that turn with an Accept and merge button. The skill says how to set it up and what to do when the user clicks it.
