Task 1 deterministic explanation mapping

Context
- App: Safe or Not
- Branch: task/deterministic-explanations
- Phase: Enhanced Verdict Explanations
- Source of truth: docs/PHASE_ENHANCED_VERDICT.md
- This task adds deterministic explanations only

Hard constraints
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add confidence scores or probabilistic language
- Do NOT add weight based dose logic
- Do NOT add emergency actions or instructions
- No new screens, minimal UI changes only

Implementation requirements
1. Add a new module src/lib/verdictExplanation.ts
   - Export types
     - VerdictType SAFE TOXIC VET FIRST
     - VerdictExplanation { reasonKey: string, text: string }
   - Export function getVerdictExplanation(params)
     - Input includes verdict and any existing fields already passed to the verdict screen today
     - Output returns a deterministic explanation using precedence rules
   - Ensure the function is pure and deterministic

2. Integrate into app/verdict.tsx
   - Import getVerdictExplanation
   - Render explanation text beneath the verdict and existing provenance section
   - Explanation must be 1 to 2 sentences
   - Do not add new interactions, accordions, or links

3. Ensure full coverage
   - SAFE always returns safe no known hazards text
   - TOXIC returns hazard specific text if a deterministic hazard label exists in current params, otherwise generic toxic
   - VET FIRST returns failure or uncertainty text if deterministically available, otherwise generic vet first depends text

4. No logic changes elsewhere
   - Do not modify smartFoodLookup.ts or foodLookup.ts
   - Do not modify verdict selection logic
   - Do not reorder pipeline steps

Docs updates required
- Update docs/devlog.md with a Task 1 entry describing deterministic mapping and where it is rendered
- Update docs/STATE.md to reflect Task 1 in progress and then complete once merged
- Update docs/handoff.md with current task status and next task TBD

Deliverables
- src/lib/verdictExplanation.ts new
- app/verdict.tsx updated to show explanation
- docs updated

Commit message
Task 1 add deterministic verdict explanations and update docs
