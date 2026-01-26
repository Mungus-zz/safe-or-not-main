import Colors from '@/constants/colors';
import foodsData from '@/src/data/foods.json';
import type { DecompositionResponse } from '@/src/lib/decomposeFood';
import { decomposeFood, normalizeUserInputForCompare } from '@/src/lib/decomposeFood';
import {
  getCachedDecomposition,
  setCachedDecomposition,
} from '@/src/lib/decompositionCache';
import { getCachedResult, setCachedResult } from '@/src/lib/lookupResultCache';
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

const MAX_EXPLANATION_CHARS = 140;
const MAX_ACTION_CHARS = 120;

function logDev(label: string, details?: string) {
  if (!__DEV__) return;
  // Keep logs minimal + easy to grep.
  // Example: SFL:result_cache_hit input="banana bread" species=dog
  console.log(`SFL:${label}${details ? ` ${details}` : ''}`);
}

function capText(input: string, maxChars: number): string {
  const text = (input ?? '').toString().trim().replace(/\s+/g, ' ');
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return '…';

  const sliceLen = maxChars - 1; // reserve room for ellipsis
  const head = text.slice(0, sliceLen);

  // Prefer sentence boundary within the head.
  const sentenceIdx = Math.max(head.lastIndexOf('.'), head.lastIndexOf('!'), head.lastIndexOf('?'));
  if (sentenceIdx >= 10) {
    let cut = head.slice(0, sentenceIdx).trimEnd();
    // If we're truncating, avoid ending with sentence punctuation before ellipsis.
    cut = cut.replace(/[.!?]+$/g, '').trimEnd();
    return `${cut}…`;
  }

  // Fallback: word boundary.
  const lastSpace = head.lastIndexOf(' ');
  if (lastSpace >= 10) {
    const cut = head.slice(0, lastSpace).trimEnd();
    return `${cut}…`;
  }

  // Last resort: hard cut.
  return `${head.trimEnd()}…`;
}

function capResult(result: FoodLookupResult): FoodLookupResult {
  return {
    ...result,
    explanation: capText(result.explanation, MAX_EXPLANATION_CHARS),
    action: capText(result.action, MAX_ACTION_CHARS),
  };
}

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
  const normalizedInput = normalizeUserInputForCompare(input);

  try {
    // 0) Final-result cache (fast path)
    const cached = await getCachedResult(normalizedInput, species);
    if (cached) {
      logDev('result_cache_hit', `input="${normalizedInput}" species=${species}`);
      return capResult(cached);
    }

    // 2) Attempt exact + synonym match via existing lookup
    if (datasetMatchExists(input)) {
      logDev('exact_match', `input="${normalizedInput}" species=${species}`);
      const direct = capResult(foodLookup(input));
      await setCachedResult(normalizedInput, species, direct);
      return direct;
    }

    // 3) Cache lookup
    let decomposition = await getCachedDecomposition(normalizedInput, species);
    if (decomposition) {
      logDev('decomp_cache_hit', `input="${normalizedInput}" species=${species}`);
    }

    // 4) Decompose if cache miss
    if (!decomposition) {
      logDev('calling_llm_decomp', `input="${normalizedInput}" species=${species}`);
      decomposition = await decomposeFood(input);
      if (!decomposition) {
        // existing UNKNOWN / VET FIRST behavior
        logDev('decomp_returned_null', `input="${normalizedInput}" species=${species}`);
        const fallback = capResult(foodLookup(input));
        await setCachedResult(normalizedInput, species, fallback);
        return fallback;
      }
      await setCachedDecomposition(normalizedInput, species, decomposition);
    }

    // 5) Map ingredients to dataset entries (ignore unknowns)
    const mapped = (decomposition.likelyIngredients ?? [])
      .map((ing) => lookupDatasetEntry(ing))
      .filter((x): x is FoodEntry => !!x);

    // If ingredient coverage is weak, fall back to UNKNOWN / VET FIRST
    if (mapped.length < 1) {
      logDev('mapped_count_verdict', `mapped=0 verdict=VET_FIRST input="${normalizedInput}" species=${species}`);
      const fallback = capResult(foodLookup(input));
      await setCachedResult(normalizedInput, species, fallback);
      return fallback;
    }

    // 6) Aggregate verdicts conservatively
    const verdict = aggregateVerdict(mapped);
    logDev(
      'mapped_count_verdict',
      `mapped=${mapped.length} verdict=${verdict.replace(' ', '_')} input="${normalizedInput}" species=${species}`,
    );

    // 7) Build result
    const result: FoodLookupResult = capResult({
      verdict,
      canonicalName: normalizedInput,
      explanation: buildExplanationFromIngredients(mapped, decomposition),
      action: baseActionForVerdict(verdict),
      color: getVerdictColor(verdict),
    });
    await setCachedResult(normalizedInput, species, result);
    return result;
  } catch {
    // Never throw
    logDev('fallback_vet_first_error', `input="${normalizedInput}" species=${species}`);
    const fallback = capResult(foodLookup(input));
    try {
      await setCachedResult(normalizedInput, species, fallback);
    } catch {
      // ignore
    }
    return fallback;
  }
}

