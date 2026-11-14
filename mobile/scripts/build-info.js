// Which code this copy of the app is running, for app.config.ts to put in the
// config's `extra`. Preview builds show it on the Account tab
// (src/components/version-section.tsx), and so does each update, since
// `eas update` reads the config again. fingerprint.config.js leaves it out of
// the runtime version, or no update would match a build from an earlier commit.

const { execFileSync } = require("node:child_process");

function git(...args) {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * The newest pull request in this code. GitHub's merge commits say
 * "Merge pull request #167 from …" with the title on the next line, and a
 * squash merge ends its title with "(#167)".
 *
 * @returns {{ number: number, title: string | null } | null}
 */
function latestPullRequest() {
  const log = git("log", "-300", "--format=%s%x1f%b%x1e");
  for (const entry of log ? log.split("\x1e") : []) {
    const [subject = "", body = ""] = entry.trim().split("\x1f");
    const merge = subject.match(/^Merge pull request #(\d+) /);
    if (merge) return { number: Number(merge[1]), title: body.trim().split("\n")[0] || null };
    const squash = subject.match(/^(.+) \(#(\d+)\)$/);
    if (squash) return { number: Number(squash[2]), title: squash[1] };
  }
  return null;
}

/**
 * What's known about the code. EAS Build may not include the repository's
 * history, but it says which commit it built. Unknown values are left out,
 * since Expo's config turns a null into an empty object.
 *
 * @returns {{ commit?: string, committedAt?: string, branch?: string, changed: boolean, pullRequest?: { number: number, title?: string } }}
 */
function readBuildInfo() {
  const commit = git("rev-parse", "HEAD") ?? process.env.EAS_BUILD_GIT_COMMIT_HASH ?? process.env.GITHUB_SHA;
  const info = {
    commit: commit ? commit.slice(0, 7) : null,
    committedAt: git("log", "-1", "--format=%cI"),
    branch: git("rev-parse", "--abbrev-ref", "HEAD"),
    changed: Boolean(git("status", "--porcelain", "--untracked-files=no")),
    pullRequest: latestPullRequest(),
  };
  return JSON.parse(JSON.stringify(info, (_key, value) => (value === null ? undefined : value)));
}

module.exports = { readBuildInfo };
