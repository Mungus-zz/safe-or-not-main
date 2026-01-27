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

const MIXED_DISH_TOKENS = [
  'soup',
  'stew',
  'pasta',
  'pizza',
  'sandwich',
  'salad',
  'casserole',
  'ramen',
  'bisque',
  'curry',
  'taco',
  'burrito',
  'kebab',
  'parmesan',
  'stir fry',
];

function isMixedDish(normalizedInput: string): boolean {
  const lower = normalizedInput.toLowerCase();
  return MIXED_DISH_TOKENS.some((token) => lower.includes(token));
}

const hazardAliasMap: Record<string, string> = {
  chocolate: 'chocolate',
  'cocoa': 'chocolate',
  'cocoa powder': 'chocolate',
  'dark chocolate': 'chocolate',
  'milk chocolate': 'chocolate',
  'chocolate chips': 'chocolate',
  'baking chocolate': 'chocolate',
  xylitol: 'xylitol',
  'sugar-free gum': 'xylitol',
  'sugar free gum': 'xylitol',
  'sugar-free candy': 'xylitol',
  'sugar free candy': 'xylitol',
  raisins: 'raisins',
  raisin: 'raisins',
  grapes: 'grapes',
  grape: 'grapes',
  alcohol: 'alcohol',
  beer: 'alcohol',
  wine: 'alcohol',
  liquor: 'alcohol',
  spirits: 'alcohol',
  macadamia: 'macadamia',
  'macadamia nut': 'macadamia',
  'macadamia nuts': 'macadamia',
  macadamias: 'macadamia',
};

const alwaysToxicSet = new Set([
  'chocolate',
  'xylitol',
  'grapes',
  'raisins',
  'alcohol',
  'macadamia',
]);

const additiveToxicSet = new Set([
  'onion',
  'garlic',
  'chives',
  'leek',
  'shallot',
  'onion powder',
  'garlic powder',
]);

function normalizeToHazardId(ingredient: string): string | null {
  const normalized = normalizeInput(ingredient);
  if (!normalized) return null;
  
  // Direct match
  if (hazardAliasMap[normalized]) {
    return hazardAliasMap[normalized];
  }
  
  // Check aliases (normalize each alias key)
  for (const [alias, hazardId] of Object.entries(hazardAliasMap)) {
    if (normalizeInput(alias) === normalized) {
      return hazardId;
    }
  }
  
  return null;
}

function isInToxicSet(
  entry: FoodEntry,
  toxicSet: Set<string>,
  aliasedIngredient?: string,
): boolean {
  const normalizedId = normalizeInput(entry.id);
  const normalizedName = normalizeInput(entry.canonicalName);
  
  // Check entry fields
  if (
    toxicSet.has(normalizedId) ||
    toxicSet.has(normalizedName) ||
    entry.synonyms.some((s) => toxicSet.has(normalizeInput(s)))
  ) {
    return true;
  }
  
  // Check aliased ingredient string
  if (aliasedIngredient && toxicSet.has(aliasedIngredient)) {
    return true;
  }
  
  return false;
}

function aggregateVerdict(
  normalizedInput: string,
  entries: FoodEntry[],
  ingredientAliases: Map<FoodEntry, string>,
): { verdict: VerdictType; downgraded: boolean } {
  const toxicDrivers = entries.filter((e) => e.verdict === 'TOXIC');
  
  if (toxicDrivers.length === 0) {
    // No toxic ingredients, check for VET FIRST, then SAFE
    for (const e of entries) {
      if (e.verdict === 'VET FIRST') return { verdict: 'VET FIRST', downgraded: false };
    }
    return { verdict: 'SAFE', downgraded: false };
  }

  // Check if any toxic driver is in alwaysToxicSet
  // Include aliased ingredient strings in the check
  const hasAlwaysToxic = toxicDrivers.some((e) => {
    const aliased = ingredientAliases.get(e);
    return isInToxicSet(e, alwaysToxicSet, aliased ?? undefined);
  });

  if (hasAlwaysToxic) {
    return { verdict: 'TOXIC', downgraded: false };
  }

  // Check if it's a mixed dish and all toxic drivers are additive
  if (isMixedDish(normalizedInput)) {
    const allAdditive = toxicDrivers.every((e) => {
      const aliased = ingredientAliases.get(e);
      return isInToxicSet(e, additiveToxicSet, aliased ?? undefined);
    });

    if (allAdditive) {
      return { verdict: 'VET FIRST', downgraded: true };
    }
  }

  return { verdict: 'TOXIC', downgraded: false };
}

function buildExplanationFromIngredients(
  mapped: FoodEntry[],
  decomposition: DecompositionResponse,
  downgraded: boolean,
): string {
  // Keep this short; Verdict screen is non-scroll.
  const uniqueCanonical = Array.from(
    new Map(mapped.map((m) => [m.canonicalName, m])).values(),
  );

  if (downgraded) {
    // Special case: mixed dish with only additive toxic ingredients
    return 'This food is generally safe, but prepared dishes often include onion or garlic. Avoid feeding unless ingredients are confirmed.';
  }

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
    // Track aliased ingredients for hazard detection
    const ingredientAliases = new Map<FoodEntry, string>();
    const allHazardIds = new Set<string>();
    
    // First pass: check all decomposed ingredients for hazard aliases
    for (const ing of decomposition.likelyIngredients ?? []) {
      const hazardId = normalizeToHazardId(ing);
      if (hazardId) {
        allHazardIds.add(hazardId);
      }
    }
    
    const mapped = (decomposition.likelyIngredients ?? [])
      .map((ing) => {
        // First try direct lookup
        const entry = lookupDatasetEntry(ing);
        if (entry) return { entry, aliased: null as string | null };
        
        // Check if ingredient matches a hazard alias
        const hazardId = normalizeToHazardId(ing);
        if (hazardId) {
          // Look up the hazard by its ID
          const hazardEntry = lookupDatasetEntry(hazardId);
          if (hazardEntry) {
            return { entry: hazardEntry, aliased: hazardId };
          }
        }
        
        return null;
      })
      .filter((x): x is { entry: FoodEntry; aliased: string | null } => !!x)
      .map(({ entry, aliased }) => {
        if (aliased) {
          ingredientAliases.set(entry, aliased);
        }
        return entry;
      });
    
    // Check if any decomposed ingredient matches an always-toxic hazard
    const hasAlwaysToxicHazard = Array.from(allHazardIds).some((hazardId) =>
      alwaysToxicSet.has(hazardId),
    );

    // If ingredient coverage is weak, fall back to UNKNOWN / VET FIRST
    if (mapped.length < 1) {
      logDev('mapped_count_verdict', `mapped=0 verdict=VET_FIRST input="${normalizedInput}" species=${species}`);
      const fallback = capResult(foodLookup(input));
      await setCachedResult(normalizedInput, species, fallback);
      return fallback;
    }

    // __DEV__ logs for chocolate cake
    if (__DEV__ && normalizedInput.includes('chocolate') && normalizedInput.includes('cake')) {
      const toxicDrivers = mapped.filter((e) => e.verdict === 'TOXIC');
      logDev(
        'hazard_detection',
        `input="${normalizedInput}" decomposed_ingredients=[${(decomposition.likelyIngredients ?? []).join(', ')}] mapped_ids=[${mapped.map((e) => e.id).join(', ')}] toxic_drivers=[${toxicDrivers.map((e) => e.id).join(', ')}] detected_hazards=[${Array.from(allHazardIds).join(', ')}]`,
      );
    }

    // 6) Aggregate verdicts conservatively
    // If any always-toxic hazard detected in decomposed ingredients, force TOXIC
    if (hasAlwaysToxicHazard) {
      logDev(
        'mapped_count_verdict',
        `mapped=${mapped.length} verdict=TOXIC always_toxic_hazard=true input="${normalizedInput}" species=${species}`,
      );
      const result: FoodLookupResult = capResult({
        verdict: 'TOXIC',
        canonicalName: normalizedInput,
        explanation: buildExplanationFromIngredients(mapped, decomposition, false),
        action: baseActionForVerdict('TOXIC'),
        color: getVerdictColor('TOXIC'),
      });
      await setCachedResult(normalizedInput, species, result);
      return result;
    }
    
    const { verdict, downgraded } = aggregateVerdict(normalizedInput, mapped, ingredientAliases);
    logDev(
      'mapped_count_verdict',
      `mapped=${mapped.length} verdict=${verdict.replace(' ', '_')}${downgraded ? ' downgraded=true' : ''} input="${normalizedInput}" species=${species}`,
    );

    // 7) Build result
    const result: FoodLookupResult = capResult({
      verdict,
      canonicalName: normalizedInput,
      explanation: buildExplanationFromIngredients(mapped, decomposition, downgraded),
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

