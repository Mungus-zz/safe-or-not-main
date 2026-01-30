import foodsData from '@/src/data/foods.json';
import { normalizeUserInputForCompare } from '@/src/lib/decomposeFood';

type VerdictType = 'SAFE' | 'TOXIC' | 'VET FIRST';

type FoodEntry = (typeof foodsData.foods)[number];

export type FoodSuggestion = {
  label: string;
  id: string;
  canonicalName: string;
  verdict: VerdictType;
  matchType: 'canonical_prefix' | 'synonym_prefix';
};

type IndexedLabel = {
  id: string;
  canonicalName: string;
  verdict: VerdictType;
  label: string;
  normalizedLabel: string;
  source: 'canonical' | 'synonym';
};

const indexedLabels: IndexedLabel[] = (() => {
  const entries: IndexedLabel[] = [];

  for (const food of foodsData.foods as FoodEntry[]) {
    const base: Omit<IndexedLabel, 'label' | 'normalizedLabel' | 'source'> = {
      id: food.id,
      canonicalName: food.canonicalName,
      verdict: food.verdict as VerdictType,
    };

    // Canonical name
    const canonicalNormalized = normalizeUserInputForCompare(food.canonicalName);
    if (canonicalNormalized) {
      entries.push({
        ...base,
        label: food.canonicalName,
        normalizedLabel: canonicalNormalized,
        source: 'canonical',
      });
    }

    // Synonyms
    for (const synonym of food.synonyms ?? []) {
      const norm = normalizeUserInputForCompare(synonym);
      if (!norm) continue;
      entries.push({
        ...base,
        label: synonym,
        normalizedLabel: norm,
        source: 'synonym',
      });
    }
  }

  return entries;
})();

export function getFoodSuggestions(query: string, limit = 12): FoodSuggestion[] {
  const normalizedQuery = normalizeUserInputForCompare(query);
  if (!normalizedQuery) return [];

  const seenIds = new Set<string>();
  const canonicalSuggestions: FoodSuggestion[] = [];
  const synonymSuggestions: FoodSuggestion[] = [];

  // Canonical prefix matches first
  for (const entry of indexedLabels) {
    if (entry.source !== 'canonical') continue;
    if (!entry.normalizedLabel.startsWith(normalizedQuery)) continue;
    if (seenIds.has(entry.id)) continue;

    canonicalSuggestions.push({
      label: entry.label,
      id: entry.id,
      canonicalName: entry.canonicalName,
      verdict: entry.verdict,
      matchType: 'canonical_prefix',
    });
    seenIds.add(entry.id);
  }

  // Then synonym prefix matches for remaining ids
  for (const entry of indexedLabels) {
    if (entry.source !== 'synonym') continue;
    if (!entry.normalizedLabel.startsWith(normalizedQuery)) continue;
    if (seenIds.has(entry.id)) continue;

    synonymSuggestions.push({
      label: entry.label,
      id: entry.id,
      canonicalName: entry.canonicalName,
      verdict: entry.verdict,
      matchType: 'synonym_prefix',
    });
    seenIds.add(entry.id);
  }

  // Rank within each group by shorter canonicalName first
  const byCanonicalLength = (a: FoodSuggestion, b: FoodSuggestion) =>
    a.canonicalName.length - b.canonicalName.length;

  canonicalSuggestions.sort(byCanonicalLength);
  synonymSuggestions.sort(byCanonicalLength);

  const combined = [...canonicalSuggestions, ...synonymSuggestions];
  return combined.slice(0, limit);
}

