import { callDeepSeek, type DeepSeekMessage } from '@/src/lib/deepseekClient';

export type DecompositionResponse = {
  version: '1';
  normalizedName: string;
  likelyIngredients: string[];
  commonVariations?: string[];
  notes?: string;
};

type RejectCode =
  | 'no_json_found'
  | 'json_parse_failed'
  | 'extra_keys'
  | 'schema_failed'
  | 'ingredient_sanitized_too_small'
  | 'name_guard_failed';

const ALLOWED_KEYS = new Set([
  'version',
  'normalizedName',
  'likelyIngredients',
  'commonVariations',
  'notes',
]);

if (__DEV__) {
  console.log('DECOMP_MODULE_LOADED_v3');
}

function logDevReject(code: RejectCode, details?: string) {
  if (!__DEV__) return;
  console.log(`DECOMP_REJECT:${code}${details ? ` ${details}` : ''}`);
}

function logDevRawPreview(raw: string) {
  if (!__DEV__) return;
  const preview = raw.slice(0, 200).replace(/\s+/g, ' ');
  console.log(`DECOMP_RAW:${preview}`);
}

export function normalizeUserInputForCompare(input: string): string {
  return input
    .trim()
    .toLowerCase()
    // Treat punctuation as separators so "mac-and-cheese" and "mac and cheese" align.
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDishName(input: string): string {
  return normalizeUserInputForCompare(input);
}

function sanitizeIngredient(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2 || cleaned.length > 32) return null;
  if (!/^[a-z ]+$/.test(cleaned)) return null;

  return cleaned;
}

function sanitizeIngredientList(value: unknown, maxItems: number): string[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    const cleaned = sanitizeIngredient(item);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }

  return out;
}

function extractFirstJsonObject(raw: string): string | null {
  // Conservative extraction: find the first balanced {...} object,
  // respecting strings and escape sequences.
  const s = raw;
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === '}') {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && start !== -1) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function buildDecomposeMessages(userInput: string): DeepSeekMessage[] {
  const input = userInput.trim();

  const system = [
    'You are a food dish decomposition service.',
    '',
    'Return JSON only.',
    '- No markdown.',
    '- No commentary.',
    '- No safety advice.',
    '- Do NOT include verdict words like SAFE, TOXIC, or VET FIRST.',
    '- Do NOT include quantities (no numbers, no measurements).',
    '- Do NOT include cooking methods or preparation steps.',
    '- Ingredients must be generic (no brand names).',
    '',
    'Output must match this schema exactly and include ONLY these keys:',
    'version, normalizedName, likelyIngredients, commonVariations, notes',
    '',
    'Rules:',
    '- version must be exactly "1".',
    '- normalizedName: a normalized dish name (no extra commentary).',
    '- likelyIngredients: 1 to 12 generic base ingredients (strings), unless the input is unrecognizable (then []).',
    '- commonVariations: optional array (0 to 8) of common ingredient variations.',
    '- notes: optional short note about variability/ambiguity (no more than ~180 chars).',
    '',
    'Critical ingredient rules to reduce hallucinations:',
    '1) If the input is a single-ingredient food (e.g. "chicken", "rice", "apple"), likelyIngredients MUST be ONLY that item.',
    '   - Do NOT add seasonings, oils, garlic, onion, herbs, or sauces unless they are explicitly part of the name.',
    '2) For mixed dishes, include only common base ingredients.',
    '   - Do NOT include onion/garlic/chives unless they are strongly typical for that specific dish name.',
    '3) If the input is unrecognizable or too vague, return JSON with likelyIngredients: [] and notes explaining it is unrecognizable (JSON only).',
    '   - The notes MUST include the word "unrecognizable".',
    '',
    'If the dish is ambiguous, still return the most common base ingredients and note variability in notes.',
    'Prefer common recipe ingredients people expect.',
    '',
    'Examples:',
    '',
    'Input: lobster bisque',
    'Output:',
    '{"version":"1","normalizedName":"lobster bisque","likelyIngredients":["lobster","cream","butter","onion","celery","carrot","stock","tomato"],"commonVariations":["brandy","garlic","flour"],"notes":"Recipes vary; some use brandy or a roux for thickening."}',
    '',
    'Input: banana bread',
    'Output:',
    '{"version":"1","normalizedName":"banana bread","likelyIngredients":["banana","flour","egg","butter","sugar","baking soda","salt"],"commonVariations":["walnut","chocolate chips","cinnamon"],"notes":"Variations often add nuts, chocolate chips, or spices."}',
  ].join('\n');

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Input: ${input}\nOutput:`,
    },
  ];
}

export function parseAndValidateDecomposition(raw: string): DecompositionResponse | null {
  try {
    const trimmed = raw.trim();
    const extracted = extractFirstJsonObject(raw);

    if (!extracted && !trimmed.startsWith('{')) {
      logDevReject('no_json_found');
      logDevRawPreview(trimmed);
      return null;
    }

    const jsonText = extracted ?? trimmed;
    if (!jsonText) {
      logDevReject('no_json_found');
      logDevRawPreview(trimmed);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // If raw contained extra text and we didn't find a JSON object, fail safely.
      logDevReject('json_parse_failed');
      logDevRawPreview(trimmed);
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      logDevReject('schema_failed');
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Reject extra keys.
    for (const key of Object.keys(obj)) {
      if (!ALLOWED_KEYS.has(key)) {
        logDevReject('extra_keys');
        return null;
      }
    }

    // Required keys
    if (obj.version !== '1') {
      logDevReject('schema_failed');
      return null;
    }
    if (typeof obj.normalizedName !== 'string') {
      logDevReject('schema_failed');
      return null;
    }
    if (!('likelyIngredients' in obj)) {
      logDevReject('schema_failed');
      return null;
    }

    const normalizedName = normalizeDishName(obj.normalizedName);
    if (normalizedName.length < 2 || normalizedName.length > 64) {
      logDevReject('schema_failed');
      return null;
    }

    const likelyIngredients = sanitizeIngredientList(obj.likelyIngredients, 12);
    if (!likelyIngredients) {
      logDevReject('schema_failed');
      return null;
    }

    let commonVariations: string[] | undefined;
    if ('commonVariations' in obj) {
      if (obj.commonVariations === undefined) {
        commonVariations = undefined;
      } else {
        const list = sanitizeIngredientList(obj.commonVariations, 8);
        if (!list) {
          logDevReject('schema_failed');
          return null;
        }
        commonVariations = list.length > 0 ? list : undefined;
      }
    }

    let notes: string | undefined;
    if ('notes' in obj) {
      if (obj.notes === undefined || obj.notes === null) {
        notes = undefined;
      } else {
        if (typeof obj.notes !== 'string') {
          logDevReject('schema_failed');
          return null;
        }
        const cleanedNotes = obj.notes.trim().replace(/\s+/g, ' ');
        if (cleanedNotes.length > 180) {
          notes = cleanedNotes.slice(0, 180);
        } else if (cleanedNotes.length === 0) {
          notes = undefined;
        } else {
          notes = cleanedNotes;
        }
      }
    }

    const result: DecompositionResponse = {
      version: '1',
      normalizedName,
      likelyIngredients,
      ...(commonVariations ? { commonVariations } : {}),
      ...(notes ? { notes } : {}),
    };

    // Enforce max lengths after final shaping.
    // Allow single foods (1). Allow empty ONLY for explicitly unrecognizable inputs.
    if (result.likelyIngredients.length === 0) {
      if (!result.notes || !/unrecognizable/i.test(result.notes)) {
        logDevReject('ingredient_sanitized_too_small');
        return null;
      }
    }
    if (result.likelyIngredients.length > 12) {
      logDevReject('schema_failed');
      return null;
    }
    if (result.commonVariations && result.commonVariations.length > 8) {
      logDevReject('schema_failed');
      return null;
    }
    if (result.notes && result.notes.length > 180) {
      logDevReject('schema_failed');
      return null;
    }

    return result;
  } catch {
    logDevReject('schema_failed');
    return null;
  }
}

export async function decomposeFood(userInput: string): Promise<DecompositionResponse | null> {
  try {
    const expectedNormalized = normalizeUserInputForCompare(userInput);

    // Fast "garbage input" gate: avoid calling the model for obvious nonsense.
    const compact = expectedNormalized.replace(/\s+/g, '');
    const hasLetter = /[a-z]/.test(expectedNormalized);
    const hasVowel = /[aeiou]/.test(expectedNormalized);
    const hasRepeatedChar4 = /([a-z0-9])\1{3,}/.test(compact);
    const isGarbage =
      expectedNormalized.length < 3 ||
      !hasLetter ||
      (!hasVowel && compact.length > 6) ||
      hasRepeatedChar4;

    if (isGarbage) {
      if (__DEV__) console.log('DECOMP_REJECT:garbage_gate');
      return null;
    }

    const messages = buildDecomposeMessages(userInput);
    const raw = await callDeepSeek(messages);
    if (__DEV__) {
      const preview = raw.slice(0, 120).replace(/\s+/g, ' ');
      console.log(`DECOMP_RAW_PREVIEW:${preview}`);
    }

    if (!raw.trim()) {
      if (__DEV__) console.log('DECOMP_REJECT:empty_raw');
      return null;
    }

    const parsed = parseAndValidateDecomposition(raw);
    if (!parsed) {
      if (__DEV__) console.log('DECOMP_REJECT:parse_or_validate_returned_null');
      return null;
    }

    // Empty list is reserved for unrecognizable inputs; return null upstream.
    if (parsed.likelyIngredients.length === 0) {
      logDevReject(
        'ingredient_sanitized_too_small',
        `expected="${expectedNormalized}" model="${normalizeUserInputForCompare(parsed.normalizedName)}"`,
      );
      return null;
    }

    const modelNormalized = normalizeUserInputForCompare(parsed.normalizedName);
    if (!modelNormalized) {
      logDevReject('name_guard_failed', `expected="${expectedNormalized}" model=""`);
      return null;
    }
    if (modelNormalized === 'unknown dish') {
      logDevReject('name_guard_failed', `expected="${expectedNormalized}" model="unknown dish"`);
      return null;
    }

    const expectedTokens = expectedNormalized.split(' ').filter(Boolean);
    const modelTokens = modelNormalized.split(' ').filter(Boolean);
    if (expectedTokens.length === 0 || modelTokens.length === 0) {
      logDevReject(
        'name_guard_failed',
        `expected="${expectedNormalized}" model="${modelNormalized}"`,
      );
      return null;
    }

    const modelSet = new Set(modelTokens);
    for (const t of expectedTokens) {
      if (!modelSet.has(t)) {
        logDevReject(
          'name_guard_failed',
          `expected="${expectedNormalized}" model="${modelNormalized}"`,
        );
        return null;
      }
    }

    parsed.normalizedName = expectedNormalized;
    return parsed;
  } catch {
    return null;
  }
}

