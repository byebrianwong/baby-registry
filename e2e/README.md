# End-to-end tests

These tests use the website the way a person does, in a real browser, and check every email that follows. They run against a local copy of Supabase on your computer, never production. Each test creates its own owners, registries and guests.

Every email the site sends lands in Mailpit, a fake inbox that comes with local Supabase. That includes Supabase's own sign-up and password emails. Tests read Mailpit to check who got which email, and they open the links inside it. You can watch the emails arrive at http://127.0.0.1:54324.

## Set up once

1. Install a Docker runtime. Colima is free and runs from the command line:

   ```bash
   brew install colima docker
   ```

   Docker Desktop or OrbStack work too.

2. Start it. Do this again after you restart your computer:

   ```bash
   colima start --cpu 4 --memory 4 --vm-type vz --mount-type virtiofs
   ```

   Colima runs a small virtual machine with no window. While it runs, it holds the memory you gave it, and macOS may warn that a virtual machine is using a lot of memory. Local Supabase itself uses about 0.5 GB. Stop Colima when you're done testing (see below).

3. Create the local database:

   ```bash
   npm run e2e:db
   ```

   The first run downloads Supabase's images, about 3.5 GB. The command starts local Supabase, empties its database and runs every file in `supabase/migrations` in name order. Run it again after adding a migration. A new migration that breaks on an empty database will fail here, which is worth knowing before it reaches production.

## Run the tests

```bash
npm run test:e2e
```

The tests start their own website on http://localhost:3100. That server reads local Supabase's address and keys from `supabase status`, and sends email to Mailpit. The values in `.env.local` don't apply to it. It builds into `.next-e2e`, so it can run next to `npm run dev`.

Add `--ui` to watch the tests run in Playwright's window, or `--headed` to see the browser.

To stop local Supabase and free Colima's memory when you're done:

```bash
supabase stop
```

```bash
colima stop
```

`supabase stop` keeps the local database. Next time, `colima start` and `supabase start --exclude studio,postgres-meta --ignore-health-check` bring it back as it was, without running `npm run e2e:db` again.

## What keeps tests away from production

- `local-supabase.ts` refuses any Supabase or Mailpit address that isn't on this computer.
- The test server never reuses a server already on its port, which could be using production.
- With `EMAIL_TRANSPORT=mailpit`, `src/lib/mailer.ts` sends to Mailpit instead of Resend. The tests also blank `RESEND_API_KEY`, so Resend couldn't send even if something skipped Mailpit.
- `e2e/db.sh` runs only local commands. Nothing in it takes `--remote`.

## Writing a test

- `fixtures.ts` creates test data with the service-role key, such as an owner with a registry and an item, and has steps several tests share, such as reserving a gift.
- `mailbox.ts` reads Mailpit. `waitForEmail(to, subject)` waits for an email, since the site sends most of them after it answers the request. `linkIn(email, pattern)` finds a link in an email to open next.
- Make every email address and slug new (`uniqueEmail`, `uniqueId`), so tests don't depend on each other or on a fresh database.
- For something that happens later, such as a reservation running out, change the time in the database and call the cron route with `CRON_SECRET`, as `guest-reserve.spec.ts` does.
