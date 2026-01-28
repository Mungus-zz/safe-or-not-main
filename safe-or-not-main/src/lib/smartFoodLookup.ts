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
import { usdaSearch, usdaFoodDetails } from '@/src/lib/usdaClient';
import { extractIngredientsText } from '@/src/lib/usdaIngredients';
import { getUsdaCached, setUsdaCached } from '@/src/lib/usdaCache';

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

function parseIngredientsText(ingredientsText: string): string[] {
  // Remove parenthetical contents (e.g., "(contains 2% or less)", "(less than 1%)")
  let cleaned = ingredientsText.replace(/\([^)]*\)/g, ' ');
  
  // Split on commas and semicolons
  const parts = cleaned.split(/[,;]/);
  
  // Common boilerplate phrases to remove (case-insensitive, word boundaries)
  const boilerplatePatterns = [
    /\bcontains\b/gi,
    /\bless than\b/gi,
    /\bmore than\b/gi,
    /\bpercent\b/gi,
    /%/g,
    /\band\/or\b/gi,
    /\bor\b/gi, // Standalone "or" only
    /\bwith\b/gi,
    /\badded\b/gi,
  ];
  
  const tokens = new Set<string>();
  
  for (const part of parts) {
    // Remove boilerplate phrases
    let phrase = part;
    for (const pattern of boilerplatePatterns) {
      phrase = phrase.replace(pattern, ' ');
    }
    
    // Normalize: trim, collapse whitespace, remove punctuation
    const normalized = normalizeInput(phrase);
    if (normalized && normalized.length >= 2) {
      tokens.add(normalized);
      
      // Also add the first word of each ingredient phrase as a token
      const firstWord = normalized.split(' ')[0];
      if (firstWord && firstWord.length >= 2 && firstWord !== normalized) {
        tokens.add(firstWord);
      }
    }
  }
  
  return Array.from(tokens);
}

function pickBestUsdaCandidate(results: Awaited<ReturnType<typeof usdaSearch>>): {
  fdcId: number;
  description: string;
  dataType: string;
  brandName?: string;
} | null {
  if (results.length === 0) return null;

  // Count results by dataType for logging
  if (__DEV__) {
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.dataType] = (counts[result.dataType] || 0) + 1;
    }
    const branded = counts['Branded'] || 0;
    const foundation = counts['Foundation'] || 0;
    const sr = counts['SR Legacy'] || 0;
    const survey = counts['Survey (FNDDS)'] || 0;
    console.log(
      `USDA_RESULTS branded=${branded} foundation=${foundation} sr=${sr} survey=${survey}`,
    );
  }

  // Priority by dataType (do not require brandName to treat as Branded):
  // Branded (highest) > Foundation > SR Legacy > Survey (FNDDS) > others
  const priorityOrder = ['Branded', 'Foundation', 'SR Legacy', 'Survey (FNDDS)'] as const;

  const rankFor = (dataType: string): number => {
    const idx = priorityOrder.indexOf(dataType as (typeof priorityOrder)[number]);
    return idx === -1 ? priorityOrder.length : idx;
  };

  let best = results[0];
  let bestRank = rankFor(best.dataType);

  for (let i = 1; i < results.length; i += 1) {
    const candidate = results[i];
    const rank = rankFor(candidate.dataType);
    if (rank < bestRank) {
      best = candidate;
      bestRank = rank;
    }
  }

  if (__DEV__) {
    console.log(
      `USDA_PICK fdcId=${best.fdcId} dataType=${best.dataType} description=${best.description} brandName=${
        best.brandName ?? null
      }`,
    );
  }

  return best;
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
  // 1) Normalize input once at the top
  let normalizedInput = normalizeUserInputForCompare(input);
  const startTime = Date.now();

  try {
    // 2) Typo correction immediately (before any caching logic)
    if (normalizedInput.length >= 5 && !normalizedInput.includes(' ')) {
      const corrections: string[] = [];
      if (normalizedInput.endsWith('e')) {
        corrections.push(normalizedInput.slice(0, -1));
      }
      if (normalizedInput.endsWith('s')) {
        corrections.push(normalizedInput.slice(0, -1));
      }
      for (const corrected of corrections) {
        if (datasetMatchExists(corrected)) {
          if (__DEV__) {
            console.log('SFL:stage=typo');
            console.log(`SFL:typo_corrected from="${normalizedInput}" to="${corrected}"`);
          }
          // Update normalizedInput to corrected version for all subsequent operations
          normalizedInput = corrected;
          break; // Use first correction that matches
        }
      }
    }

    // 3) Deterministic exact + synonym match (after typo correction, before cache)
    if (datasetMatchExists(normalizedInput)) {
      if (__DEV__) console.log('SFL:stage=exact');
      logDev('exact_match', `input="${normalizedInput}" species=${species}`);
      const direct = capResult(foodLookup(normalizedInput));
      await setCachedResult(normalizedInput, species, direct);
      if (__DEV__) {
        const totalMs = Date.now() - startTime;
        console.log(`SFL:total_ms=${totalMs}`);
      }
      return direct;
    }

    // 4) Result cache (after typo correction and exact match)
    const cached = await getCachedResult(normalizedInput, species);
    if (cached) {
      if (__DEV__) console.log('SFL:stage=result_cache');
      logDev('result_cache_hit', `input="${normalizedInput}" species=${species}`);
      if (__DEV__) {
        const totalMs = Date.now() - startTime;
        console.log(`SFL:total_ms=${totalMs}`);
      }
      return capResult(cached);
    }

    // 4) USDA lookup (cache + API)
    if (__DEV__) console.log('SFL:stage=usda');
    let usdaUsed = false;
    let usdaHasIngredients = false;
    let llmUsed = false;

    try {
      // Check USDA cache first
      const usdaCached = await getUsdaCached(normalizedInput);
      
      let usdaIngredientsText: string | null = null;
      let usdaCandidate: { fdcId: number; description: string; dataType: string; brandName?: string } | null = null;

      if (usdaCached) {
        // Soft miss: if cached but ingredients are missing or empty, retry
        const hasIngredients = usdaCached.ingredientsText && usdaCached.ingredientsText.trim().length > 0;
        
        if (!hasIngredients) {
          if (__DEV__) console.log('USDA_CACHE:soft_miss reason=no_ingredients');
          // Treat as miss and retry search
          // Use raw input if 2+ words for better branded food matching
          const searchQuery = input.trim().split(/\s+/).length >= 2 ? input : normalizedInput;
          const searchResults = await usdaSearch(searchQuery);
          usdaCandidate = pickBestUsdaCandidate(searchResults);
          
          if (usdaCandidate) {
            usdaUsed = true;
            // Fetch details
            const details = await usdaFoodDetails(usdaCandidate.fdcId);
            usdaIngredientsText = extractIngredientsText(details);
            
            // If ingredients extracted, overwrite cache entry
            if (usdaIngredientsText) {
              await setUsdaCached(normalizedInput, {
                query: normalizedInput,
                fdcId: usdaCandidate.fdcId,
                description: usdaCandidate.description,
                dataType: usdaCandidate.dataType,
                brandName: usdaCandidate.brandName,
                ingredientsText: usdaIngredientsText,
              });
            } else {
              // Still no ingredients - keep existing cache entry (don't overwrite)
              usdaCandidate = {
                fdcId: usdaCached.fdcId,
                description: usdaCached.description,
                dataType: usdaCached.dataType,
                brandName: usdaCached.brandName,
              };
            }
          } else {
            // No candidate found - use cached entry
            usdaUsed = true;
            usdaIngredientsText = null;
            usdaCandidate = {
              fdcId: usdaCached.fdcId,
              description: usdaCached.description,
              dataType: usdaCached.dataType,
              brandName: usdaCached.brandName,
            };
          }
        } else {
          // Cache hit with ingredients - use it
          usdaUsed = true;
          usdaIngredientsText = usdaCached.ingredientsText ?? null;
          usdaCandidate = {
            fdcId: usdaCached.fdcId,
            description: usdaCached.description,
            dataType: usdaCached.dataType,
            brandName: usdaCached.brandName,
          };
        }
      } else {
        // No cache - run USDA search
        // Use raw input if 2+ words for better branded food matching
        const searchQuery = input.trim().split(/\s+/).length >= 2 ? input : normalizedInput;
        const searchResults = await usdaSearch(searchQuery);
        usdaCandidate = pickBestUsdaCandidate(searchResults);
        
        if (usdaCandidate) {
          usdaUsed = true;
          // Fetch details
          const details = await usdaFoodDetails(usdaCandidate.fdcId);
          usdaIngredientsText = extractIngredientsText(details);
          
          // Cache USDA result
          await setUsdaCached(normalizedInput, {
            query: normalizedInput,
            fdcId: usdaCandidate.fdcId,
            description: usdaCandidate.description,
            dataType: usdaCandidate.dataType,
            brandName: usdaCandidate.brandName,
            ingredientsText: usdaIngredientsText ?? undefined,
          });
        }
      }

      // If USDA provided ingredients, process them
      if (usdaIngredientsText) {
        usdaHasIngredients = true;
        const ingredientTokens = parseIngredientsText(usdaIngredientsText);
        
        if (__DEV__) {
          const preview = ingredientTokens.slice(0, 10).join(',');
          console.log(`SFL:usda_tokens count=${ingredientTokens.length} preview="${preview}"`);
        }
        
        // Track aliased ingredients for hazard detection
        const ingredientAliases = new Map<FoodEntry, string>();
        const allHazardIds = new Set<string>();
        
        // Check all tokens for hazard aliases
        for (const token of ingredientTokens) {
          const hazardId = normalizeToHazardId(token);
          if (hazardId) {
            allHazardIds.add(hazardId);
          }
        }
        
        // Map tokens to dataset entries
        const mapped = ingredientTokens
          .map((token) => {
            // First try direct lookup
            const entry = lookupDatasetEntry(token);
            if (entry) return { entry, aliased: null as string | null };
            
            // Check if token matches a hazard alias
            const hazardId = normalizeToHazardId(token);
            if (hazardId) {
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

        // Check if any token matches an always-toxic hazard
        const hasAlwaysToxicHazard = Array.from(allHazardIds).some((hazardId) =>
          alwaysToxicSet.has(hazardId),
        );

        // If ingredient coverage is weak, fall back to LLM
        if (mapped.length < 1) {
          if (__DEV__) {
            console.log('SFL:usda_has_ingredients=false reason=no_mapped_ingredients');
            usdaHasIngredients = false;
          }
        } else {
          // Use USDA ingredients - build result
          if (hasAlwaysToxicHazard) {
            const result: FoodLookupResult = capResult({
              verdict: 'TOXIC',
              canonicalName: normalizedInput,
              explanation: buildExplanationFromIngredients(mapped, {
                version: '1',
                normalizedName: normalizedInput,
                likelyIngredients: ingredientTokens,
              } as DecompositionResponse, false),
              action: baseActionForVerdict('TOXIC'),
              color: getVerdictColor('TOXIC'),
            });
            await setCachedResult(normalizedInput, species, result);
            if (__DEV__) {
              const totalMs = Date.now() - startTime;
              console.log(`SFL:usda_used=${usdaUsed}`);
              console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
              console.log(`SFL:llm_used=false`);
              console.log(`SFL:total_ms=${totalMs}`);
            }
            return result;
          }

          const { verdict, downgraded } = aggregateVerdict(normalizedInput, mapped, ingredientAliases);
          const result: FoodLookupResult = capResult({
            verdict,
            canonicalName: normalizedInput,
            explanation: buildExplanationFromIngredients(mapped, {
              version: '1',
              normalizedName: normalizedInput,
              likelyIngredients: ingredientTokens,
            } as DecompositionResponse, downgraded),
            action: baseActionForVerdict(verdict),
            color: getVerdictColor(verdict),
          });
          await setCachedResult(normalizedInput, species, result);
          if (__DEV__) {
            const totalMs = Date.now() - startTime;
            console.log(`SFL:usda_used=${usdaUsed}`);
            console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
            console.log(`SFL:llm_used=false`);
            console.log(`SFL:total_ms=${totalMs}`);
          }
          return result;
        }
      }
    } catch (err) {
      // USDA lookup failed - proceed to LLM
      if (__DEV__) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.log(`SFL:usda_used=false reason=error error="${errorMsg}"`);
      }
    }

    // 5) LLM decomposition path (only if USDA didn't provide ingredients)
    if (!usdaHasIngredients) {
      llmUsed = true;

      // Decomposition cache check (just before calling LLM)
      let decomposition = await getCachedDecomposition(normalizedInput, species);
      if (decomposition) {
        if (__DEV__) console.log('SFL:stage=decomp_cache');
        logDev('decomp_cache_hit', `input="${normalizedInput}" species=${species}`);
      }

      // 6) Decompose via LLM if cache miss
      if (!decomposition) {
        if (__DEV__) console.log('SFL:stage=llm');
        logDev('calling_llm_decomp', `input="${normalizedInput}" species=${species}`);
        decomposition = await decomposeFood(input);
        if (!decomposition) {
          // existing UNKNOWN / VET FIRST behavior
          logDev('decomp_returned_null', `input="${normalizedInput}" species=${species}`);
          const fallback = capResult(foodLookup(input));
          await setCachedResult(normalizedInput, species, fallback);
          if (__DEV__) {
            const totalMs = Date.now() - startTime;
            console.log(`SFL:usda_used=${usdaUsed}`);
            console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
            console.log(`SFL:llm_used=${llmUsed}`);
            console.log(`SFL:total_ms=${totalMs}`);
          }
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
        if (__DEV__) {
          const totalMs = Date.now() - startTime;
          console.log(`SFL:usda_used=${usdaUsed}`);
          console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
          console.log(`SFL:llm_used=${llmUsed}`);
          console.log(`SFL:total_ms=${totalMs}`);
        }
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
        if (__DEV__) {
          const totalMs = Date.now() - startTime;
          console.log(`SFL:usda_used=${usdaUsed}`);
          console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
          console.log(`SFL:llm_used=${llmUsed}`);
          console.log(`SFL:total_ms=${totalMs}`);
        }
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
      if (__DEV__) {
        const totalMs = Date.now() - startTime;
        console.log(`SFL:usda_used=${usdaUsed}`);
        console.log(`SFL:usda_has_ingredients=${usdaHasIngredients}`);
        console.log(`SFL:llm_used=${llmUsed}`);
        console.log(`SFL:total_ms=${totalMs}`);
      }
      return result;
    }
  } catch {
    // Never throw
    logDev('fallback_vet_first_error', `input="${normalizedInput}" species=${species}`);
    const fallback = capResult(foodLookup(input));
    try {
      await setCachedResult(normalizedInput, species, fallback);
    } catch {
      // ignore
    }
    if (__DEV__) {
      const totalMs = Date.now() - startTime;
      console.log(`SFL:usda_used=false`);
      console.log(`SFL:usda_has_ingredients=false`);
      console.log(`SFL:llm_used=false`);
      console.log(`SFL:total_ms=${totalMs}`);
    }
    return fallback;
  }
}

