// Checks the file names in supabase/migrations, so two branches can't add
// migrations with the same version. The Migrations workflow runs it on pull
// requests that change the folder, and on main. Run it yourself with
// `npm run check:migrations`.
//
// The Supabase CLI reads a migration's version from the digits before the
// first underscore, and its history table keeps each version only once. New
// files take their version from the time: `supabase migration new <name>`
// makes 20261110113500_<name>.sql. The older files are numbered 001 to 017,
// and two pairs got the same number before this check: 009 and 015.

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("./migrations/", import.meta.url));

/** The highest of the old numbered files. New files use a timestamp. */
const LAST_NUMBERED = 17;

/** Pairs that share a version from before this check. Both have run. */
const SHARED_BEFORE_CHECK = {
  "009": ["009_registry_types.sql", "009_restrict_registry_reads.sql"],
  "015": ["015_events.sql", "015_gift_reservations.sql"],
};

/** The pattern the Supabase CLI uses. It skips files that don't match. */
const MIGRATION_FILE = /^([0-9]+)_(.*)\.sql$/;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOW_TO_NAME = "Make migrations with `supabase migration new <name>`.";

/** A YYYYMMDDHHMMSS version that is a real time, and not in the future. */
function timestampProblem(version) {
  if (!/^\d{14}$/.test(version)) return "isn't a 14-digit timestamp";
  const [y, mo, d, h, mi, s] = version.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/).slice(1).map(Number);
  const time = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (time.getUTCMonth() !== mo - 1 || time.getUTCDate() !== d || h > 23 || mi > 59 || s > 59) {
    return "isn't a real date and time";
  }
  // A day of slack for clocks. Anything later is a typo, and it would sort
  // after every migration made until then.
  if (time.getTime() > Date.now() + DAY_MS) return "is in the future";
  return null;
}

const problems = [];
const filesByVersion = new Map();

for (const file of readdirSync(dir).sort()) {
  if (file.startsWith(".")) continue;
  const match = MIGRATION_FILE.exec(file);
  if (!match) {
    problems.push(`${file}: the Supabase CLI skips files not named <version>_<name>.sql. ${HOW_TO_NAME}`);
    continue;
  }

  const version = match[1];
  if (version.length === 3) {
    if (Number(version) > LAST_NUMBERED) {
      problems.push(
        `${file}: numbered files stop at ${String(LAST_NUMBERED).padStart(3, "0")}, because two branches can pick the same next number. ${HOW_TO_NAME}`
      );
    }
  } else {
    const problem = timestampProblem(version);
    if (problem) problems.push(`${file}: the version ${version} ${problem}. ${HOW_TO_NAME}`);
  }

  filesByVersion.set(version, [...(filesByVersion.get(version) ?? []), file]);
}

for (const [version, files] of filesByVersion) {
  if (files.length < 2) continue;
  const allowed = SHARED_BEFORE_CHECK[version];
  if (allowed && files.length === allowed.length && files.every((f) => allowed.includes(f))) continue;
  problems.push(`${files.join(" and ")} share the version ${version}. Give the newer one its own. ${HOW_TO_NAME}`);
}

if (problems.length > 0) {
  console.error(`supabase/migrations has ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`supabase/migrations: ${filesByVersion.size} versions, no new ones shared.`);
