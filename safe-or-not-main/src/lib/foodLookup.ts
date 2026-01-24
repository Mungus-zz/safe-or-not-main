import foodsData from '@/src/data/foods.json';
import Colors from '@/constants/colors';

type VerdictType = 'SAFE' | 'TOXIC' | 'VET FIRST';

export interface FoodLookupResult {
  verdict: VerdictType;
  canonicalName: string;
  explanation: string;
  action: string;
  color: string;
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

/**
 * Looks up a food in the dataset and returns verdict data.
 * Returns VET FIRST as default for unknown foods.
 */
export function foodLookup(input: string): FoodLookupResult {
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

  // Search through foods array
  for (const food of foodsData.foods) {
    // a) Check exact match to id
    if (normalizeInput(food.id) === normalized) {
      return {
        verdict: food.verdict as VerdictType,
        canonicalName: food.canonicalName,
        explanation: food.explanation,
        action: food.action,
        color: getVerdictColor(food.verdict as VerdictType),
      };
    }

    // b) Check exact match to canonicalName
    if (normalizeInput(food.canonicalName) === normalized) {
      return {
        verdict: food.verdict as VerdictType,
        canonicalName: food.canonicalName,
        explanation: food.explanation,
        action: food.action,
        color: getVerdictColor(food.verdict as VerdictType),
      };
    }

    // c) Check exact match to any synonym
    for (const synonym of food.synonyms) {
      if (normalizeInput(synonym) === normalized) {
        return {
          verdict: food.verdict as VerdictType,
          canonicalName: food.canonicalName,
          explanation: food.explanation,
          action: food.action,
          color: getVerdictColor(food.verdict as VerdictType),
        };
      }
    }
  }

  // d) No match found - return default VET FIRST
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
