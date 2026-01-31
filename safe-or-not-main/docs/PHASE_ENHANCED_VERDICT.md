Phase — Enhanced Verdict Explanations
Purpose

Reveal the reasoning behind each verdict clearly and deterministically, without expanding system intelligence or altering verdict outcomes.

This phase is about explanation, not evaluation.

Guiding Principle

Do not interpret risk.
Explain known outcomes.

Allowed Changes

Deterministic verdict explanation text

Explicit naming of known toxic ingredients or hazards

Plain-language clarification of preparation or quantity uncertainty

Microcopy that clarifies why uncertainty exists

Not Allowed

New verdict types

Confidence scores or probability language

Weight-based dose calculations

Emergency actions or instructions

New data sources

New intelligence or inference logic

Educational or long-form content

Changes to lookup pipeline order

Changes to verdict logic or fail-closed behavior

Tasks
1. Deterministic Explanation Mapping

One explanation generator per verdict

Output derived strictly from existing lookup results

No branching beyond verdict category

No probabilistic or inferred language

2. Hazard Grounding

**Purpose:** Ground explanations using hazards already produced by the existing pipeline. Presentation only.

**Scope:** Applies only to TOXIC and VET FIRST when matched hazards already exist. SAFE unchanged.

**Rules:**
- Use only existing matchedHazards
- Do not infer hazards from ingredients
- No new detection logic or data sources
- Deterministic ordering only (alphabetical)
- Display max two hazards

**Behavior:**
- TOXIC: show grounding when hazards exist
- VET FIRST: show grounding only when hazards exist
- VET FIRST without hazards: no grounding
- SAFE: no grounding

**Copy constraints:**
- Under five seconds
- Must name known toxic components when available
- No dosage math, emergency instructions, or educational content

**Completion criteria:**
- Grounding shown deterministically where applicable
- Verdict logic and pipeline unchanged
- No new inference introduced
- Docs reflect Task 2 status accurately

3. Explanation Structure

Single concise explanation per verdict

Readable in under five seconds

No dosage math

No timelines

No emergency guidance

Conceptual examples:

TOXIC
“Contains xylitol, which is known to cause dangerous drops in blood sugar in dogs.”

VET FIRST
“Safety depends on preparation or amount. Garlic can be harmful in sufficient quantities.”

SAFE
“No known toxic components for dogs in typical amounts.”

4. Verdict Screen Integration

Explanation displayed directly with verdict

Does not compete with verdict typography

No additional user interaction required

Treated as supporting clarity, not primary signal

Completion Criteria

Every verdict includes a deterministic explanation

Core lookup loop unchanged

No intelligence or inference introduced

Users can understand why a verdict was returned without leaving the app

No new liabilities introduced

Relationship to Other Phases
Preceded by

Trust & Confidence Surfacing

Enables

Weight-Based Dose Risk

Emergency Quick Actions

Exit Condition

This phase is complete when enhanced verdict explanations are:

Implemented

Reflected in devlog and state documentation

Verified to not alter verdict logic or pipeline behavior