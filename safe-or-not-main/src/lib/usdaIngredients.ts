function logDev(label: string, details?: string) {
  if (!__DEV__) return;
  console.log(`USDA_INGREDIENTS:${label}${details ? ` ${details}` : ''}`);
}

/**
 * Extracts ingredients text from a USDA FoodData Central food object.
 * Only returns a non-empty string if an ingredients field exists.
 * Normalizes by trimming and collapsing whitespace.
 * Does not infer from description or nutrients.
 */
export function extractIngredientsText(usdaFood: any): string | null {
  if (!usdaFood || typeof usdaFood !== 'object') {
    logDev('extracted=false', 'reason=invalid_object');
    return null;
  }

  let ingredientsText: string | null = null;
  let matchedField: string | null = null;

  // 1) Check direct string fields in priority order, return first non-empty string
  if (typeof usdaFood.ingredients === 'string' && usdaFood.ingredients.trim()) {
    ingredientsText = usdaFood.ingredients;
    matchedField = 'ingredients';
  } else if (
    typeof usdaFood.ingredientsDescription === 'string' &&
    usdaFood.ingredientsDescription.trim()
  ) {
    ingredientsText = usdaFood.ingredientsDescription;
    matchedField = 'ingredientsDescription';
  } else if (
    typeof usdaFood.labelIngredients === 'string' &&
    usdaFood.labelIngredients.trim()
  ) {
    ingredientsText = usdaFood.labelIngredients;
    matchedField = 'labelIngredients';
  } else if (Array.isArray(usdaFood.foodAttributes)) {
    // 2) Fallback: search foodAttributes array for an "ingredients" attribute
    // Find the first attribute where name includes "ingredients" (case insensitive)
    // and value is a non-empty string
    for (const attr of usdaFood.foodAttributes) {
      if (!attr || typeof attr !== 'object') continue;
      const name = String((attr as any).name ?? '').toLowerCase();
      const value = (attr as any).value;
      if (!name || !name.includes('ingredients')) continue;
      if (typeof value !== 'string') continue;
      if (!value.trim()) continue;
      ingredientsText = value;
      matchedField = 'foodAttributes';
      break;
    }
  }

  if (!ingredientsText || typeof ingredientsText !== 'string') {
    logDev('extracted=false', 'reason=no_ingredients_field');
    return null;
  }

  // 3) Normalize: trim and collapse whitespace
  const normalized = ingredientsText.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    logDev('extracted=false', 'reason=empty_after_normalize');
    return null;
  }

  // 4) Log with field that matched
  logDev(
    'extracted=true',
    `field=${matchedField ?? 'unknown'} length=${normalized.length}`,
  );
  return normalized;
}
