Safe or Not

A fast, privacy-first food safety checker for dogs.

Safe or Not helps pet owners quickly determine whether a food is SAFE, TOXIC, or VET FIRST for dogs.
The system prioritizes deterministic data, speed, and trust, with AI used only as a controlled fallback.

Core Principles

Safety first
Always-toxic hazards are enforced deterministically.

Deterministic before AI
Local data → USDA → cached results → LLM fallback.

Fast by default
Most lookups resolve in milliseconds without network calls.

Privacy-first
No accounts, no tracking, no backend storage.

Explainable outcomes
Every verdict is derived from identifiable ingredients or known hazards.

Verdicts
Verdict	Meaning
SAFE	Known to be safe for dogs
TOXIC	Known to be dangerous or poisonous
VET FIRST	Uncertain or mixed dish; consult a vet before feeding
Lookup Pipeline (Order Matters)

The lookup flow is intentionally ordered for correctness and speed:

Exact match (local dataset)
Immediate result from foods.json.

Typo correction
Common single-word typos corrected before any caching.

Result cache
Previously resolved inputs return instantly.

USDA FoodData Central (fast path)

Searches up to 25 candidates

Prioritizes Branded foods

Extracts explicit ingredient lists only

Cached with soft-miss retries

LLM decomposition (fallback only)

Used only when USDA ingredients are unavailable

Strict JSON schema

Name guards prevent drift

Fails fast on rate limits and timeouts

This guarantees predictable behavior and avoids hallucinated ingredients.

Always-Toxic Hazards (Hard Rules)

These always result in TOXIC, regardless of dish type:

Chocolate (incl. cocoa)

Xylitol

Grapes

Raisins

Alcohol

Macadamia nuts

Alias detection ensures variants (e.g. “cocoa”, “sugar-free gum”) are caught.

Mixed Dish Logic

Prepared foods (soups, stews, casseroles, etc.) follow special rules:

If only additive toxins (onion, garlic, chives) are present
→ Verdict is downgraded to VET FIRST

If any always-toxic hazard is present
→ Verdict remains TOXIC

This prevents false panic while still protecting pets.

Autocomplete (Local, Deterministic)

Autocomplete improves speed and confidence without affecting free text input.

Data source: local foods.json only

Prefix matching (canonical first, then synonyms)

Max 12 suggestions

Deduplicated by ID

Scrollable, keyboard-safe dropdown

Selecting a suggestion fills the input but never blocks manual entry

Autocomplete does not restrict what users can submit.

USDA Integration

The app uses the USDA FoodData Central API as a deterministic middle layer.

Search results expanded to 25 for better branded coverage

Prioritizes Branded → Foundation → SR → Survey

Ingredient extraction only from explicit ingredient fields

No inference from descriptions or nutrients

30-day cache with soft-miss retry behavior

Environment variable required:

EXPO_PUBLIC_USDA_API_KEY

LLM Fallback (Controlled)

LLMs are used only when:

No exact match exists

USDA ingredients are unavailable

No cached decomposition exists

Safeguards:

Strict JSON schema

Name guard allows branded prefixes but prevents drift

Fail-fast on 429s and timeouts

Safe-by-default (returns VET FIRST on failure)

Tech Stack

Expo + React Native

TypeScript

AsyncStorage for local caching

USDA FoodData Central API

OpenRouter (DeepSeek free model) for fallback decomposition

Development
Install
npm install

Environment

Create a .env file:

EXPO_PUBLIC_USDA_API_KEY=your_usda_key
EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key

Run
npx expo start

Project Structure (Relevant)
src/
  lib/
    smartFoodLookup.ts     # Core intelligence pipeline
    decomposeFood.ts       # LLM decomposition + guards
    usdaClient.ts          # USDA API client
    usdaCache.ts           # USDA caching
    usdaIngredients.ts     # Ingredient extraction
    autocompleteFoods.ts   # Local autocomplete logic
data/
  foods.json               # Canonical food dataset
app/
  input.tsx                # Input + autocomplete UI

Roadmap (High-Level)

Local history + favorites

Confidence explanations per verdict

Optional premium speed tier

Accessibility refinements

iOS App Store submission

Disclaimer

This app provides educational guidance only and does not replace professional veterinary advice. When in doubt, always consult a licensed veterinarian.
