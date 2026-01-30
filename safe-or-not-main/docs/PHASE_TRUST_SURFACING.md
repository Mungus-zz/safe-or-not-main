# Phase — Trust & Confidence Surfacing

## Purpose
Reveal the certainty and reasoning that already exists in the system without expanding scope or adding intelligence.

This phase is about clarity, not capability.

## Guiding Principle
Do not make the app smarter.
Make the correct answer feel obvious.

## Allowed Changes
- Confidence and provenance labeling
- Explanation and action copy refinement
- Local-only history
- Autocomplete UX refinement
- Network failure handling
- Microcopy alignment

## Not Allowed
- New verdict types
- New data sources
- New intelligence logic
- Educational UI
- Accounts, analytics, or sharing
- Feature expansion beyond the core loop

## Tasks

### 1. Confidence & Provenance Model
- Derive confidence strictly from pipeline stage
- Examples:
  - Confirmed from built-in list
  - Verified from ingredient list
  - Dish ingredients can vary
  - Unknown, check with vet
- No scores or meters

### 2. Explanation Unification
- One deterministic explanation generator
- One sentence explanation
- One sentence action
- Ingredient or hazard grounded
- Always-toxic hazards explicitly named

### 3. Verdict Screen Confidence Surfacing
- Subtle label or line
- Does not compete with verdict typography
- Honest about source and certainty

### 4. Local History
- Last 10 checks only
- Stored locally
- Tap to rerun
- Clear option

### 5. Autocomplete Refinement
- Canonical names first
- Synonyms second
- Max 12 results
- Keyboard-safe
- Free text always allowed

### 6. Network Resilience
- Consistent timeouts
- Single retry on transient failures
- No retry on rate limits
- All failures return VET FIRST

## Completion Criteria
- Core loop unchanged
- App feels calmer and more trustworthy
- No new liabilities introduced
- All answers are honest about certainty
