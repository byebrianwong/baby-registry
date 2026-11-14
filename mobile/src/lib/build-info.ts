// Which code this copy of the app is running: the commit and newest pull
// request it was built or updated from (app.config.ts puts them in the
// config's `extra`), and which over-the-air update it's on. Preview builds
// show it on the Account tab, so you can tell whether you have the latest.

import Constants from "expo-constants";
import * as Updates from "expo-updates";

export type BuildInfo = {
  commit: string | null;
  committedAt: string | null;
  branch: string | null;
  changed: boolean;
  pullRequest: { number: number; title: string | null } | null;
};

const text = (value: unknown) => (typeof value === "string" && value ? value : null);

function fromConfig(config: unknown): BuildInfo | null {
  const build = (config as { extra?: { build?: unknown } } | null | undefined)?.extra?.build;
  if (!build || typeof build !== "object") return null;
  const { commit, committedAt, branch, changed, pullRequest } = build as Record<string, unknown>;
  const pr = pullRequest as { number?: unknown; title?: unknown } | undefined;
  return {
    commit: text(commit),
    committedAt: text(committedAt),
    branch: text(branch),
    changed: changed === true,
    pullRequest: typeof pr?.number === "number" ? { number: pr.number, title: text(pr.title) } : null,
  };
}

/** The code an update was published from, read from its manifest. */
export function updateBuildInfo(manifest: unknown): BuildInfo | null {
  return fromConfig((manifest as { extra?: { expoClient?: unknown } } | null | undefined)?.extra?.expoClient);
}

/** The code running now: the update the app launched, or the build itself. */
export const runningBuild: BuildInfo | null = updateBuildInfo(Updates.manifest) ?? fromConfig(Constants.expoConfig);

/** Preview builds and development show it. The store version doesn't. */
export const showsBuildInfo = __DEV__ || Updates.channel === "preview";

/** "#167 Let Android password managers fill the app's sign-in fields" */
export function pullRequestLabel(build: BuildInfo | null) {
  const pr = build?.pullRequest;
  if (!pr) return null;
  return pr.title ? `#${pr.number} ${pr.title}` : `#${pr.number}`;
}

/** "Nov 13, 10:24 PM" */
export function stamp(date: Date | string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
