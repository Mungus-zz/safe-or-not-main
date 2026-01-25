import Colors from '@/constants/colors';
import foodsData from '@/src/data/foods.json';
import type { DecompositionResponse } from '@/src/lib/decomposeFood';
import { decomposeFood, normalizeUserInputForCompare } from '@/src/lib/decomposeFood';
import {
  getCachedDecomposition,
  setCachedDecomposition,
} from '@/src/lib/decompositionCache';
import { foodLookup, normalizeInput, type FoodLookupResult } from '@/src/lib/foodLookup';

type Species = 'dog' | 'cat';
type VerdictType = FoodLookupResult['verdict'];

type FoodEntry = {
  id: string;
  canonicalName: string;
  synonyms: string[];
  verdict: VerdictType;
  explanation: string;
  action: string;
  species?: string[];
};

const foods = (foodsData as unknown as { foods: FoodEntry[] }).foods ?? [];

const byNormalizedKey: Map<string, FoodEntry> = (() => {
  const map = new Map<string, FoodEntry>();

  const add = (keyRaw: string, entry: FoodEntry) => {
    const key = normalizeInput(keyRaw);
    if (!key) return;
    if (!map.has(key)) map.set(key, entry);
  };

  for (const food of foods) {
    add(food.id, food);
    add(food.canonicalName, food);
    for (const s of food.synonyms ?? []) add(s, food);
  }

  return map;
})();

function getVerdictColor(verdict: VerdictType): string {
  switch (verdict) {
    case 'SAFE':
      return Colors.safe;
    case 'TOXIC':
      return Colors.toxic;
    case 'VET FIRST':
    default:
      return Colors.vetFirst;
  }
}

function baseActionForVerdict(verdict: VerdictType): string {
  switch (verdict) {
    case 'TOXIC':
      return 'Contact a vet immediately.';
    case 'SAFE':
      return 'Generally safe in small amounts.';
    case 'VET FIRST':
    default:
      return 'When unsure, contact your vet first.';
  }
}

function datasetMatchExists(rawInput: string): boolean {
  const key = normalizeInput(rawInput);
  return !!key && byNormalizedKey.has(key);
}

function lookupDatasetEntry(raw: string): FoodEntry | null {
  const key = normalizeInput(raw);
  if (!key) return null;
  return byNormalizedKey.get(key) ?? null;
}

function aggregateVerdict(entries: FoodEntry[]): VerdictType {
  for (const e of entries) {
    if (e.verdict === 'TOXIC') return 'TOXIC';
  }
  for (const e of entries) {
    if (e.verdict === 'VET FIRST') return 'VET FIRST';
  }
  return 'SAFE';
}

function buildExplanationFromIngredients(
  mapped: FoodEntry[],
  decomposition: DecompositionResponse,
): string {
  // Keep this short; Verdict screen is non-scroll.
  const uniqueCanonical = Array.from(
    new Map(mapped.map((m) => [m.canonicalName, m])).values(),
  );

  const toxic = uniqueCanonical.filter((e) => e.verdict === 'TOXIC').map((e) => e.canonicalName);
  const vetFirst = uniqueCanonical
    .filter((e) => e.verdict === 'VET FIRST')
    .map((e) => e.canonicalName);
  const safe = uniqueCanonical.filter((e) => e.verdict === 'SAFE').map((e) => e.canonicalName);

  let msg = 'Based on common ingredients, ';
  if (toxic.length > 0) {
    msg += `this may contain toxic items like ${toxic.slice(0, 2).join(', ')}.`;
  } else if (vetFirst.length > 0) {
    msg += `some ingredients may be risky (e.g., ${vetFirst.slice(0, 2).join(', ')}).`;
  } else if (safe.length > 0) {
    msg += `the recognized ingredients appear safe.`;
  } else {
    msg = 'Safety can vary by preparation or portion size.';
  }

  // Add a gentle uncertainty note if the model signaled variability.
  if (decomposition.notes && msg.length < 150) {
    const extra = ` ${decomposition.notes}`;
    msg = (msg + extra).slice(0, 180);
  }

  return msg.length > 180 ? msg.slice(0, 180) : msg;
}

/**
 * Conservative, deterministic smart lookup:
 * - Exact/synonym dataset match wins immediately
 * - Otherwise optionally decompose dish via LLM (cached), then map ingredients to dataset
 * - Aggregates verdicts conservatively
 */
export async function smartFoodLookup(input: string, species: Species): Promise<FoodLookupResult> {
  try {
    const normalizedInput = normalizeUserInputForCompare(input);

    // 2) Attempt exact + synonym match via existing lookup
    const direct = foodLookup(input);
    if (datasetMatchExists(input)) {
      return direct;
    }

    // 3) Cache lookup
    let decomposition = await getCachedDecomposition(normalizedInput, species);

    // 4) Decompose if cache miss
    if (!decomposition) {
      decomposition = await decomposeFood(input);
      if (!decomposition) {
        // existing UNKNOWN / VET FIRST behavior
        return foodLookup(input);
      }
      await setCachedDecomposition(normalizedInput, species, decomposition);
    }

    // 5) Map ingredients to dataset entries (ignore unknowns)
    const mapped = (decomposition.likelyIngredients ?? [])
      .map((ing) => lookupDatasetEntry(ing))
      .filter((x): x is FoodEntry => !!x);

    // If ingredient coverage is weak, fall back to UNKNOWN / VET FIRST
    if (mapped.length < 1) {
      return foodLookup(input);
    }

    // 6) Aggregate verdicts conservatively
    const verdict = aggregateVerdict(mapped);

    // 7) Build result
    return {
      verdict,
      canonicalName: normalizedInput,
      explanation: buildExplanationFromIngredients(mapped, decomposition),
      action: baseActionForVerdict(verdict),
      color: getVerdictColor(verdict),
    };
  } catch {
    // Never throw
    return foodLookup(input);
  }
}

