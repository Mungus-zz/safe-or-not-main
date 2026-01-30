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

Every explanation must be grounded in one of:

A known toxic ingredient

A preparation or quantity-dependent risk

A confirmed absence of known hazards

Always-toxic hazards must be explicitly named

Unknowns must remain honest about uncertainty

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