# Cursor Prompt — Enhanced Verdict Explanations — Task 1 (Deterministic Explanation Mapping)

You are working in the repo: safe-or-not-main
Authoritative branch: phase/trust-confidence

Authoritative docs:
- docs/HANDOFF.md
- docs/STATE.md
- docs/PHASE_ENHANCED_VERDICT.md

Goal
Implement Task 1: Deterministic Explanation Mapping.
Introduce a deterministic, explainable “why” line for every verdict, derived only from existing results and inputs. This improves trust and clarity without changing behavior.

Hard constraints
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add confidence scores, probabilities, or inference
- Do NOT add emergency actions or dose calculations
- Do NOT add education, long form content, or summaries
- Explanations must be deterministic and derived from existing results only
- No UI redesign. Add a single concise line only.

Implementation requirements
1) Create new module: src/lib/verdictExplanation.ts

Types
- VerdictType: 'SAFE' | 'TOXIC' | 'VET FIRST'
- VerdictExplanation: { reasonKey: string; text: string }

Function
Create a pure function:

export function getVerdictExplanation(params: {
  verdict: VerdictType
  provenance?: string
  matchedHazards?: string[] | string
  matchedIngredients?: string[] | string
}): VerdictExplanation

Notes
- matchedHazards and matchedIngredients may be arrays or JSON strings. Handle both deterministically.
- Stable sort hazard ids alphabetically for deterministic output.
- Format hazard ids to display names using this mapping:
  chocolate -> Chocolate
  xylitol -> Xylitol
  grapes -> Grapes
  raisins -> Raisins
  alcohol -> Alcohol
  macadamia -> Macadamia nuts

Precedence rules
TOXIC
- If hazards exist, use first formatted hazard after stable sort:
  reasonKey: toxic_known_hazard
  text: "Contains {Hazard}, which is a known dog toxin."
- Else:
  reasonKey: toxic_generic
  text: "A known dog toxin was detected in what we checked."

VET FIRST
- If provenance is missing, empty, or unknown like values:
  reasonKey: vetfirst_verification_failed
  text: "We could not verify the ingredients reliably, so safety is unclear."
- Else if hazards exist OR matchedIngredients exist:
  reasonKey: vetfirst_depends
  text: "Safety can depend on preparation or amount, so verify the ingredients first."
- Else:
  reasonKey: vetfirst_verification_failed
  text: "We could not verify the ingredients reliably, so safety is unclear."

SAFE
- reasonKey: safe_no_known_hazards
- text: "No known dog toxins were found in what we checked. Different recipes or portions can change this."

2) Integrate into app/verdict.tsx
- Do not remove or alter existing verdictData.explanation or verdictData.action.
- Parse matchedHazards and matchedIngredients as currently done, then call getVerdictExplanation:
  const deterministic = getVerdictExplanation({ verdict: verdictData.verdict, provenance, matchedHazards, matchedIngredients });
- Render deterministic.text as a single concise line:
  Placement: directly beneath the verdict and confidence label, above the food name (or equivalent top body content).
- Styling: reuse existing typography styles, slightly smaller or same as existing explanation style, minimal margin. Keep it readable in under 5 seconds.

3) Docs updates
- docs/devlog.md
  Add an entry for Task 1 describing:
  - Added deterministic explanation mapping module
  - Rendered deterministic explanation line on verdict screen
  - Confirmed no changes to verdict logic or lookup pipeline
- docs/STATE.md
  Update phase status and Task 1 status per existing conventions.
- docs/HANDOFF.md
  Update current task status and next task pointer.

4) Manual checks
- TOXIC item with hazard present shows hazard in deterministic line
- Unknown input that fails closed shows vetfirst_verification_failed text
- SAFE known safe item shows safe_no_known_hazards non absolute text

Deliverables
- src/lib/verdictExplanation.ts added
- app/verdict.tsx updated to display deterministic explanation line
- docs updated (devlog, state, handoff)
- No other functional changes

Commit message
Task 1 add deterministic verdict explanations and update docs
