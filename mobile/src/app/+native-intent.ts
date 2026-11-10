// Links that open the app from outside. The iPhone share extension opens
// regibee://dataUrl=<key>#weburl, which isn't a screen, so send it to the
// share screen. ShareIntentProvider reads the shared content itself.

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes("dataUrl=")) return "/share";
    return path;
  } catch {
    return "/";
  }
}
