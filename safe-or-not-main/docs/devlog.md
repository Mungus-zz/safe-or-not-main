# Safe or Not — Development Log

Chronological log of implementation from the beginning of the MVP codebase.

---

## 1. Local JSON Dataset Lookup

**Goal:** Replace mock verdict logic with a local JSON dataset lookup.

**Changes:**
- **`src/data/foods.json`** — Created with the canonical dataset (id, canonicalName, synonyms, verdict, explanation, action).
- **`src/lib/foodLookup.ts`** — Implemented:
  - `normalizeInput`: trim, lowercase, collapse spaces, remove punctuation.
  - `foodLookup`: exact match by `id`, then `canonicalName`, then any `synonym`; default `VET FIRST` for unknown.
  - `chooseBestMatch`: priority A (id) > B (canonicalName) > C (synonym); within same priority, sort by verdict severity (TOXIC > VET FIRST > SAFE); special rule: if input contains “sugar free” and a match is xylitol, choose xylitol.
- **`app/input.tsx`** — “Check” action calls `foodLookup(input)` and navigates to verdict screen with `verdict`, `canonicalName`, `explanation`, `action`, `color`.
- **`app/verdict.tsx`** — Receives verdict data from route params instead of `getVerdictData()`.

---

## 2. Fix Runtime Errors (No Backend MVP)

**Goal:** App launches without errors; no backend/TRPC in MVP.

**Changes:**
- **`app/_layout.tsx`** — Exported a default React component; removed TRPC initialization and dependencies; minimal Expo Router Stack layout with `headerShown: false`.

---

## 3. Figma Visual & Motion Polish

**Goal:** Match Figma styling and add subtle animations.

**Changes:**
- **`constants/colors.ts`**, **`constants/theme.ts`** — Warm pet-brand palette, typography, spacing, radius, shadow tokens; warm off-white backgrounds; verdict colors (SAFE / TOXIC / VET FIRST).
- **`src/lib/motion.ts`** — Fade + vertical movement transitions.
- **`app/input.tsx`**, **`app/verdict.tsx`** — Applied theme tokens and motion; premium/tactile buttons; no structural or navigation changes.

---

## 4. Microcopy Tone Refinements

**Goal:** Humanize CTAs and reduce anxiety in copy; no logic or flow changes.

**Changes:**
- **`app/input.tsx`** — CTA e.g. “Check” → “See if it’s safe”; navigation “Back” → “Check another food”.
- **`app/onboarding.tsx`**, **`app/verdict.tsx`** — Softer, contextual copy.
- **`src/lib/foodLookup.ts`** — Explanations/actions aligned with tone.

---

## 5. DeepSeek Client (OpenRouter)

**Goal:** Call OpenRouter Chat Completions for LLM responses.

**Changes:**
- **`src/lib/deepseekClient.ts`** — New:
  - API key from `EXPO_PUBLIC_OPENROUTER_API_KEY`.
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`.
  - Model: `tngtech/deepseek-r1t2-chimera:free`.
  - `callDeepSeek(messages)`: timeout 20s, one retry on `AbortError` (400ms delay); no retry on 429 (rate limit).
  - `__DEV__` logs: `OPENROUTER_CALL` (duration, model, retry); error body preview capped at 100 chars.

---

## 6. Dish Decomposition Module

**Goal:** LLM-backed decomposition of dish names into ingredients (no safety advice in LLM).

**Changes:**
- **`src/lib/decomposeFood.ts`** — New:
  - `DecompositionResponse` type; `normalizeUserInputForCompare`.
  - `buildDecomposeMessages`: JSON-only prompts, examples, rules for single-ingredient, mixed dishes, unrecognizable input.
  - `parseAndValidateDecomposition`: strict schema + ingredient sanitization (lowercase, trim, `^[a-z ]+$`, length 2–32, no duplicates).
  - `decomposeFood`: calls `callDeepSeek`, validates, ensures `response.normalizedName` token-includes expected normalized input; returns `null` on failure.
  - Garbage gate: reject &lt;3 chars, &lt;1 letter, no vowels and length &gt;6, or repeated single char 4+ times.
  - Name guard: exact match, or `startsWith` with length diff ≤2, or whole-word substring with length diff ≤20; reject “unknown dish”.
  - `__DEV__` logs: `DECOMP_ENTER`, `DECOMP_CALLING_MODEL`, `DECOMP_REJECT:*`, raw preview, schema/ingredient failures.

---

## 7. Decomposition Cache Layer

**Goal:** Cache decomposition results in AsyncStorage.

**Changes:**
- **`src/lib/decompositionCache.ts`** — New:
  - Key format: `decomp:v3:${normalizedName}:${species}`.
  - Envelope: `{ value: DecompositionResponse, createdAt, expiresAt }`; TTL 30 days.
  - `getCachedDecomposition`, `setCachedDecomposition`, `clearExpiredDecompositions` (chunked scan, best-effort).

---

## 8. USDA FoodData Central Client

**Goal:** Minimal client for USDA FDC API.

**Changes:**
- **`src/lib/usdaClient.ts`** — New:
  - API key: `EXPO_PUBLIC_USDA_API_KEY`; base URL `https://api.nal.usda.gov/fdc/v1`.
  - `usdaSearch`: POST `/foods/search`, pageSize 25; returns top results with `fdcId`, `description`, `dataType`, `brandName`.
  - `usdaFoodDetails`: GET `/food/{fdcId}`; raw JSON.
  - Timeout 6s; one retry on network/5xx/429; `__DEV__` logs `USDA_CALL` (type, duration, status, retry).

---

## 9. Safe USDA Ingredient Extractor

**Goal:** Extract ingredients text from USDA food objects.

**Changes:**
- **`src/lib/usdaIngredients.ts`** — New:
  - `extractIngredientsText(usdaFood)`: check `ingredients`, `ingredientsDescription`, `labelIngredients`, then `foodAttributes` (name includes “ingredients”); return first non-empty string; trim and collapse whitespace; `__DEV__` log with matched field.

---

## 10. AsyncStorage Cache for USDA Lookups

**Goal:** Cache USDA search/details to avoid repeat API calls.

**Changes:**
- **`src/lib/usdaCache.ts`** — New:
  - Key prefix `usda:v1:`; payload: `query`, `fdcId`, `description`, `dataType`, `brandName`, optional `ingredientsText`, `cachedAt`; TTL 30 days.
  - `getUsdaCached`, `setUsdaCached`; corrupt/expired entries removed; `__DEV__` log `USDA_CACHE` hit/miss.

---

## 11. Smart Food Lookup Pipeline

**Goal:** Single pipeline: local dataset → USDA (cache + API) → decomposition (cache + LLM); aggregate verdicts; cache final result.

**Changes:**
- **`src/lib/smartFoodLookup.ts`** — New/updated:
  - Flow: normalize → typo handling → exact dataset match → result cache → USDA (cache, then search + `pickBestUsdaCandidate` + details + `extractIngredientsText`) → if no USDA ingredients: decomposition cache → LLM decomposition.
  - USDA: soft cache miss when cached entry has no `ingredientsText`; retry search/details and overwrite cache if ingredients found.
  - USDA query: use raw user input when 2+ words for better branded matches.
  - Ingredient parsing: split on comma/semicolon; drop parentheticals and boilerplate (“contains”, “less than”, “%”, “and/or”, etc.); normalize and keep first word of phrases.
  - Verdict aggregation: map ingredients to dataset; TOXIC if any TOXIC, else VET FIRST if any VET FIRST, else SAFE; mixed-dish rule: if `isMixedDish` and only additive toxics (e.g. onion/garlic/chives), downgrade to VET FIRST; `hazardAliasMap` for robust hazard detection.
  - Result cache: `lookupResultCache` for final `FoodLookupResult`.
  - Text caps: explanation 140, action 120; `__DEV__` logs `SFL:stage`, `SFL:usda_tokens`, `SFL:hazard_detection`.

---

## 12. Wire SmartFoodLookup into Input Flow

**Goal:** Use smart pipeline instead of local-only lookup.

**Changes:**
- **`app/input.tsx`** — Replaced `foodLookup` with `smartFoodLookup(foodInput, species="dog")`.

---

## 13. Prevent Duplicate Lookups While Loading

**Goal:** Disable double-tap and show loading state.

**Changes:**
- **`app/input.tsx`** — `isLoading` state; `handleCheck` returns early if loading; set `isLoading = true` before `smartFoodLookup`, `false` in `finally`; button disabled and label “Checking...” while loading.

---

## 14. Bump Cache Key Versions

**Goal:** Invalidate old cache entries after schema/flow changes.

**Changes:**
- **`src/lib/lookupResultCache.ts`** — Key prefix `result:v5:` → `result:v13:`.
- **`src/lib/decompositionCache.ts`** — Key prefix `decomp:v2:` → `decomp:v3:`.

---

## 15. Expand foods.json

**Goal:** Broaden local dataset and fix one entry.

**Changes:**
- **`src/data/foods.json`** — Added 20+ SAFE entries for dogs; updated “cocoa-baked-goods” to TOXIC with revised explanation/action.

---

## 16. Assistive Autocomplete

**Goal:** Local-dataset-only autocomplete in the input screen.

**Changes:**
- **`src/lib/autocompleteFoods.ts`** — New:
  - Index from `foods.json` (canonicalName + synonyms); `getFoodSuggestions(query, limit=12)`: normalized prefix match, dedupe by id, canonical then synonym, sort by shorter canonicalName; `FoodSuggestion` includes `matchType: 'canonical_prefix' | 'synonym_prefix'`.
- **`app/input.tsx`**:
  - `useDebouncedValue(foodInput, 150)` for suggestion query.
  - Suggestions from `getFoodSuggestions(debouncedQuery)`; `FlatList`, max height 280, `keyboardShouldPersistTaps="handled"`.
  - `handleSelectSuggestion`: fill input, clear suggestions, dismiss keyboard.
  - “Search &lt;query&gt;” row to clear suggestions; outside tap dismisses.
  - `onSubmitEditing`: if top suggestion is canonical_prefix match, select it; else run check.
  - Prefix highlighting in suggestion rows; empty state: “No matches in the list. You can still check any food.” when length ≥2 and no suggestions.
  - `getChipStyleForVerdict` (local) for suggestion verdict chips.

---

## 17. Layout Smoke Test (USDA Key)

**Goal:** Quick dev check that USDA API key is present.

**Changes:**
- **`app/_layout.tsx`** — In `__DEV__`, log `USDA_KEY_EXISTS:${hasUsdaKey}` (from `process.env.EXPO_PUBLIC_USDA_API_KEY`) during onboarding check.

---

## Task 1 — Provenance + confidence metadata (2026-01-29)

Added provenance + confidence metadata to lookup results; passed through navigation; no verdict logic changes.

---

## Task 2 — Confidence label and honest trust language (2026-01-29)

Surfaced confidence label and honest trust language on verdict screen.

---

## Task 3 — Unified explanation and action copy (provenance-honest) (2026-01-29)

Unified explanation and action copy for clarity; all copy is provenance-honest and verdict-aligned. No verdict logic or pipeline order changed.

Task 3 — Copy polish: reduced repetition in verdict explanations (2026-01-29).

---

## Task 4 — Local history (last 10 checks) with rerun (2026-01-29)

Local-only history of the last 10 food checks; tap to rerun, clear option. No scope expansion—surfaces past certainty without new capability. Implemented: AsyncStorage-backed check history (normalized input, canonical name, verdict, provenance, timestamp); input screen shows “Recent checks” list with verdict indicator and clear action; tap item reruns smartFoodLookup and navigates to verdict same as a fresh check. Fixed useFocusEffect import source (@react-navigation/native).

---

## Task 5 — Autocomplete refinement (UI-only)

- Assistive autocomplete suggestions powered by local foods dataset
- Prefix-based suggestions (canonical and synonyms), capped at 12
- Tap fills input only, no auto-run, no behavior change
- Clears on empty input, loading, or navigation
- No changes to verdict logic, lookup pipeline, or data sources
- Docs updated to reflect completion and stable phase state

---

## Task 6 — Network resilience

Network resilience behavior was already implemented in code; no new code changes were required. Documented completion of phase. Existing behavior: consistent timeouts (USDA 6s, OpenRouter/DeepSeek 20s); single retry on transient failures (network/5xx); no retry on rate limits (429); all failures fail closed to VET FIRST.

---

## Staging — Phase Enhanced Verdict Explanations

Phase **Enhanced Verdict Explanations** staged in docs. **docs/PHASE_ENHANCED_VERDICT.md** is the source of truth for the new phase. No code changes in this commit. Next work begins with Task 1 — Deterministic Explanation Mapping on a new task branch.

---

## Summary

The MVP now has: local JSON lookup with priority and sugar-free/xylitol rule; Expo Router layout without backend; Figma-aligned visuals and motion; refined microcopy; OpenRouter/DeepSeek client with timeout and 429 fast-fail; decomposition module with validation and name guard; decomposition, USDA, and result caches; USDA client and ingredient extraction; smart lookup pipeline with USDA + LLM fallback and conservative verdict aggregation; loading guard on submit; local-dataset autocomplete with prefix match and keyboard handling; and local history (last 10 checks) with tap-to-rerun and clear. All caches use 30-day TTL and versioned keys; dev logging is gated by `__DEV__`.
