import foodsData from '@/src/data/foods.json';
import Colors from '@/constants/colors';

type VerdictType = 'SAFE' | 'TOXIC' | 'VET FIRST';

export type ProvenanceType =
  | 'dataset_exact'
  | 'result_cache'
  | 'usda_ingredients'
  | 'decomp_cache'
  | 'llm_decomposition'
  | 'fallback_unknown';

export function getConfidenceLabel(provenance: ProvenanceType): string {
  switch (provenance) {
    case 'dataset_exact':
      return 'Confirmed from built-in list';
    case 'result_cache':
      return 'Confirmed from recent check';
    case 'usda_ingredients':
      return 'Verified from ingredient list';
    case 'decomp_cache':
    case 'llm_decomposition':
      return 'Dish ingredients can vary';
    case 'fallback_unknown':
    default:
      return 'Unknown, check with vet';
  }
}

/** Base result from foodLookup (no provenance). Extended by smart lookup. */
export type BaseFoodLookupResult = {
  verdict: VerdictType;
  canonicalName: string;
  explanation: string;
  action: string;
  color: string;
};

export interface FoodLookupResult extends BaseFoodLookupResult {
  provenance: ProvenanceType;
  confidenceLabel: string;
  matchedIngredients: string[];
  matchedHazards: string[];
}

/**
 * Normalizes input string for matching:
 * - Trims whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces to single space
 * - Removes punctuation
 */
export function normalizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^\w\s]/g, ''); // Remove punctuation
}

type MatchPriority = 'A' | 'B' | 'C';

type MatchEntry = {
  food: (typeof foodsData.foods)[number];
  priority: MatchPriority;
  matchType: 'id' | 'canonicalName' | 'synonym';
};

function logDev(label: string, details?: string) {
  if (!__DEV__) return;
  console.log(`FOOD_LOOKUP:${label}${details ? ` ${details}` : ''}`);
}

function verdictSeverity(verdict: VerdictType): number {
  switch (verdict) {
    case 'TOXIC':
      return 3;
    case 'VET FIRST':
      return 2;
    case 'SAFE':
      return 1;
    default:
      return 0;
  }
}

function chooseBestMatch(
  matches: MatchEntry[],
  normalizedInput: string,
  originalInput: string,
): MatchEntry | null {
  if (matches.length === 0) return null;

  // Special rule: if input contains "sugar free" and any match has id "xylitol", always choose that
  const originalLower = originalInput.toLowerCase();
  const hasSugarFree =
    originalLower.includes('sugar free') ||
    originalLower.includes('sugar-free') ||
    originalLower.includes('sugarfree') ||
    normalizedInput.includes('sugar free') ||
    normalizedInput.includes('sugarfree');
  if (hasSugarFree) {
    const xylitolMatch = matches.find((m) => m.food.id === 'xylitol');
    if (xylitolMatch) {
      logDev('match_chosen', `input="${normalizedInput}" chosen=xylitol reason="sugar_free_special_rule"`);
      return xylitolMatch;
    }
  }

  // Group by priority
  const byPriority: Record<MatchPriority, MatchEntry[]> = { A: [], B: [], C: [] };
  for (const match of matches) {
    byPriority[match.priority].push(match);
  }

  // Choose highest priority bucket with matches
  let candidates: MatchEntry[] = [];
  if (byPriority.A.length > 0) {
    candidates = byPriority.A;
  } else if (byPriority.B.length > 0) {
    candidates = byPriority.B;
  } else if (byPriority.C.length > 0) {
    candidates = byPriority.C;
  }

  if (candidates.length === 0) return null;

  // Within same priority, prefer by verdict severity (TOXIC > VET FIRST > SAFE)
  candidates.sort((a, b) => {
    const severityA = verdictSeverity(a.food.verdict as VerdictType);
    const severityB = verdictSeverity(b.food.verdict as VerdictType);
    return severityB - severityA; // Higher severity first
  });

  const chosen = candidates[0];
  const priorityLabel = chosen.priority;
  const verdict = chosen.food.verdict;
  const id = chosen.food.id;
  const matchType = chosen.matchType;
  const totalInBucket = candidates.length;

  logDev(
    'match_chosen',
    `input="${normalizedInput}" chosen=${id} priority=${priorityLabel} verdict=${verdict} match_type=${matchType} total_in_bucket=${totalInBucket}`,
  );

  return chosen;
}

/**
 * Looks up a food in the dataset and returns verdict data (no provenance).
 * Returns VET FIRST as default for unknown foods.
 */
export function foodLookup(input: string): BaseFoodLookupResult {
  const normalized = normalizeInput(input);

  if (!normalized) {
    // Empty input defaults to VET FIRST
    return {
      verdict: 'VET FIRST',
      canonicalName: '',
      explanation: 'Safety can vary by preparation or portion size.',
      action: 'When unsure, contact your vet first.',
      color: Colors.vetFirst,
    };
  }

  // Collect all matches
  const matches: MatchEntry[] = [];

  for (const food of foodsData.foods) {
    // Priority A: Check exact match to id
    if (normalizeInput(food.id) === normalized) {
      matches.push({ food, priority: 'A', matchType: 'id' });
    }

    // Priority B: Check exact match to canonicalName
    if (normalizeInput(food.canonicalName) === normalized) {
      matches.push({ food, priority: 'B', matchType: 'canonicalName' });
    }

    // Priority C: Check exact match to any synonym
    for (const synonym of food.synonyms) {
      if (normalizeInput(synonym) === normalized) {
        matches.push({ food, priority: 'C', matchType: 'synonym' });
        break; // Only add once per food even if multiple synonyms match
      }
    }
  }

  // Choose best match using priority and severity rules
  const bestMatch = chooseBestMatch(matches, normalized, input);

  if (bestMatch) {
    return {
      verdict: bestMatch.food.verdict as VerdictType,
      canonicalName: bestMatch.food.canonicalName,
      explanation: bestMatch.food.explanation,
      action: bestMatch.food.action,
      color: getVerdictColor(bestMatch.food.verdict as VerdictType),
    };
  }

  // No match found - return default VET FIRST
  return {
    verdict: 'VET FIRST',
    canonicalName: input.trim(), // Use cleaned input for unknown foods
    explanation: 'Safety can vary by preparation or portion size.',
    action: 'When unsure, contact your vet first.',
    color: Colors.vetFirst,
  };
}

/**
 * Returns the color for a given verdict type.
 */
function getVerdictColor(verdict: VerdictType): string {
  switch (verdict) {
    case 'SAFE':
      return Colors.safe;
    case 'TOXIC':
      return Colors.toxic;
    case 'VET FIRST':
      return Colors.vetFirst;
    default:
      return Colors.vetFirst;
  }
}
