// Category grouping for the Analytics page.
//
// A "group" rolls several categories into one line (e.g. all apartments, all utilities).
// Two layers, checked in order:
//   1. CUSTOM_GROUPS — hand-built groups you define here. Use for cross-cutting
//      groupings that don't follow the naming convention.
//   2. Auto-grouping — anything named "Prefix - Detail" is grouped by its Prefix.
//      e.g. "Apartment - Gorkého byt" and "Apartment - Gorkého garzónka" → "Apartment".
//   3. Otherwise the category stands on its own (e.g. "Mortgage / Loans", "Food & Groceries").
//
// NOTE: groups operate on whole categories. To isolate something that currently lives
// inside another category (e.g. electricity inside "Utilities - Belá"), first give it its
// own category via a rule, then add it here.

export const CUSTOM_GROUPS: Record<string, string[]> = {
  // Examples — uncomment / edit to taste:
  // 'Property running costs': ['Belá', 'Utilities - Belá'],
  // 'All housing': ['Mortgage / Loans', 'Apartment - Gorkého byt', 'Apartment - Gorkého garzónka'],
};

// Categories that should never be grouped or rolled up (kept as-is, or hidden).
export const EXCLUDE_FROM_GROUPS = new Set<string>(['Internal transfer', 'Uncategorized']);

export function groupOf(category: string): string {
  for (const [g, cats] of Object.entries(CUSTOM_GROUPS)) {
    if (cats.includes(category)) return g;
  }
  const idx = category.indexOf(' - ');
  if (idx > 0) return category.slice(0, idx).trim();
  return category;
}
