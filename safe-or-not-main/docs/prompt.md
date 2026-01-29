Task 3: Unify explanation + action copy for clarity (provenance-honest)

Goal:
Make every verdict explanation and action feel inevitable, calm, and consistent.
This is copy unification and light structuring only.

Hard constraints:
- Do NOT change verdict logic.
- Do NOT change lookup pipeline order.
- Do NOT add new data sources.
- Do NOT add new screens.
- Do NOT add icons, meters, percentages, or education content.
- Keep UI changes minimal; prefer using existing fields (explanation, action).

Files to inspect / adjust:
- src/lib/foodLookup.ts
- src/lib/smartFoodLookup.ts (only if explanation/action are assembled here)
- any helper that formats explanation/action text
- app/verdict.tsx (only if rendering requires slight formatting, no redesign)
- docs/STATE.md
- docs/devlog.md

Requirements:
1) Standardize explanation tone:
- 1–2 short sentences max
- Ingredient-grounded when ingredients are known
- Never imply certainty beyond provenance
- Avoid hedging when deterministic (dataset_exact, usda_ingredients)
- For decomp_cache / llm_decomposition: explicitly acknowledge variability once

2) Standardize action tone:
- Must match verdict severity
- Must be short and directive
- No panic language
- No medical claims
- If VET FIRST: encourage vet confirmation before feeding
- If TOXIC: advise contacting a vet/poison helpline immediately
- If SAFE: simple reassurance and portion moderation reminder (optional)

3) Explanation/action templates by provenance:
- dataset_exact:
  explanation: confirmed known safe/toxic item
  action: verdict-aligned
- usda_ingredients:
  explanation: derived from listed ingredients; mention key hazard if present
  action: verdict-aligned
- result_cache:
  explanation: same result as last check; do NOT add new claims
  action: verdict-aligned
- decomp_cache / llm_decomposition:
  explanation: dish ingredients can vary; mention any detected hazards if present
  action: generally “check ingredients / ask vet first” unless always-toxic hazard triggers TOXIC
- fallback_unknown:
  explanation: not enough info to verify
  action: vet-first guidance

4) Ensure always-toxic hazards are called out explicitly in explanation when matchedHazards includes them.

Docs updates (required):
A) docs/STATE.md
- Under “What Is Implemented”, add: “Explanations and actions unified and provenance-honest”
- Set “Next Task” to: “Add local history (last 10 checks) with rerun”

B) docs/devlog.md
- Add a dated entry: “Task 3 — Unified explanation and action copy for clarity (provenance-honest)”

Output:
- List files changed
- Show the final explanation/action template mapping you implemented
- Confirm verdict logic unchanged
