/**
 * Generates a consistent HTML element ID for a category section.
 * Used by both the category section headings and the navigation links.
 */
export function getCategorySectionId(categoryId: string | null): string {
  if (categoryId === null) return "section-other-items";
  if (categoryId === "gift-funds") return "section-gift-funds";
  return `section-${categoryId}`;
}
