import { callDeepSeek, type DeepSeekMessage } from '@/src/lib/deepseekClient';

export type DecompositionResponse = {
  version: '1';
  normalizedName: string;
  likelyIngredients: string[];
  commonVariations?: string[];
  notes?: string;
};

const ALLOWED_KEYS = new Set([
  'version',
  'normalizedName',
  'likelyIngredients',
  'commonVariations',
  'notes',
]);

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
    '- likelyIngredients: 2 to 12 generic base ingredients (strings).',
    '- commonVariations: optional array (0 to 8) of common ingredient variations.',
    '- notes: optional short note about variability/ambiguity (no more than ~180 chars).',
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
    const jsonText = extractFirstJsonObject(raw) ?? raw.trim();
    if (!jsonText) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // If raw contained extra text and we didn't find a JSON object, fail safely.
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

    const obj = parsed as Record<string, unknown>;

    // Reject extra keys.
    for (const key of Object.keys(obj)) {
      if (!ALLOWED_KEYS.has(key)) return null;
    }

    // Required keys
    if (obj.version !== '1') return null;
    if (typeof obj.normalizedName !== 'string') return null;
    if (!('likelyIngredients' in obj)) return null;

    const normalizedName = normalizeDishName(obj.normalizedName);
    if (normalizedName.length < 2 || normalizedName.length > 64) return null;

    const likelyIngredients = sanitizeIngredientList(obj.likelyIngredients, 12);
    if (!likelyIngredients) return null;
    if (likelyIngredients.length < 2) return null;

    let commonVariations: string[] | undefined;
    if ('commonVariations' in obj) {
      if (obj.commonVariations === undefined) {
        commonVariations = undefined;
      } else {
        const list = sanitizeIngredientList(obj.commonVariations, 8);
        if (!list) return null;
        commonVariations = list.length > 0 ? list : undefined;
      }
    }

    let notes: string | undefined;
    if ('notes' in obj) {
      if (obj.notes === undefined || obj.notes === null) {
        notes = undefined;
      } else {
        if (typeof obj.notes !== 'string') return null;
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
    if (result.likelyIngredients.length < 2 || result.likelyIngredients.length > 12) return null;
    if (result.commonVariations && result.commonVariations.length > 8) return null;
    if (result.notes && result.notes.length > 180) return null;

    return result;
  } catch {
    return null;
  }
}

export async function decomposeFood(userInput: string): Promise<DecompositionResponse | null> {
  try {
    const expectedNormalized = normalizeUserInputForCompare(userInput);
    const messages = buildDecomposeMessages(userInput);
    const raw = await callDeepSeek(messages);
    const parsed = parseAndValidateDecomposition(raw);
    if (!parsed) return null;
    const modelNormalized = normalizeUserInputForCompare(parsed.normalizedName);
    if (modelNormalized !== expectedNormalized) return null;
    parsed.normalizedName = expectedNormalized;
    return parsed;
  } catch {
    return null;
  }
}

