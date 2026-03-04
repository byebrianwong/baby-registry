import { DEFAULT_CHECKLIST } from "@/lib/checklist-data";

/** Match checklist items to registry items using keyword-based fuzzy matching */
export function getChecklistProgress(registryTitles: string[]): {
  matched: number;
  total: number;
} {
  const lowerTitles = registryTitles.map((t) => t.toLowerCase());
  let matched = 0;
  const total = DEFAULT_CHECKLIST.reduce((sum, c) => sum + c.items.length, 0);

  for (const category of DEFAULT_CHECKLIST) {
    for (const item of category.items) {
      const lower = item.name.toLowerCase();
      const alternatives = lower.split(/\s*[\/&]\s*/);
      const altKeywords = alternatives.map((alt) =>
        alt.split(/\s+/).filter((w) => w.length > 2)
      );

      const isMatched = lowerTitles.some(
        (title) =>
          title === lower ||
          title.includes(lower) ||
          lower.includes(title) ||
          altKeywords.some(
            (keywords) =>
              keywords.length > 0 && keywords.every((kw) => title.includes(kw))
          ) ||
          altKeywords.some((keywords) => {
            if (keywords.length === 0) return false;
            const longest = keywords.reduce((a, b) =>
              a.length >= b.length ? a : b
            );
            return longest.length >= 4 && title.includes(longest);
          })
      );

      if (isMatched) matched++;
    }
  }

  return { matched, total };
}
