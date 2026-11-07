// Skips words like "&" so "Jane & John Doe" becomes "JD", not "J&".
export function initialsFor(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^[\p{L}\p{N}]/u.test(word));
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}
