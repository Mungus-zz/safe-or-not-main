# Safe or Not — Current State

## Identity (locked)
- Fast, privacy-first food safety checker for dogs
- Core loop: type food → get verdict → exit
- Utility tool, not a platform
- No accounts, no tracking, no behavioral nudging
- Designed for moments of uncertainty, not daily engagement

## Supported Species (locked)
- Dogs only

## Verdict System (locked)
- SAFE
- TOXIC
- VET FIRST

Rules:
- Unknown never defaults to SAFE
- Any failure defaults to VET FIRST
- No scores, percentages, or additional verdict types

## Lookup Pipeline (implemented and locked)
1. Local foods.json exact match (canonical name or synonym)
2. Normalization and typo handling
3. Local result cache
4. USDA FoodData Central ingredient list extraction
5. Cached ingredient results (USDA or LLM)
6. LLM ingredient decomposition (fallback only)
7. Deterministic aggregation and verdict resolution
8. Fail closed to VET FIRST on any error

AI is never used to decide verdicts.  
AI is used only to extract ingredients when deterministic sources fail.

## Always-Toxic Hazards (locked)
- Chocolate (including cocoa)
- Xylitol
- Grapes
- Raisins
- Alcohol
- Macadamia nuts

Presence of any always-toxic hazard results in TOXIC regardless of context.

## Mixed Dish Rules (locked)
- Prepared foods with additive risks only (onion, garlic, chives) → VET FIRST
- Any always-toxic hazard present → TOXIC (no downgrade)

## What Is Implemented (current reality)
- Expo Router app with onboarding, input, and verdict screens
- Deterministic foods.json dataset with real coverage
- Autocomplete powered by local dataset
- USDA FoodData Central integration
- Ingredient extraction and caching
- LLM fallback for ingredient decomposition only
- Multi-layer caching (lookup, USDA, decomposition)
- Always-toxic enforcement
- Deterministic verdict resolution
- Network guards and fail-closed behavior
- Lookup results include provenance + confidence metadata
- Verdict screen surfaces confidence label derived from lookup provenance
- Explanations and actions unified and provenance-honest; final copy polish applied to reduce repetition in verdict explanations
- Local history (last 10 checks) with tap-to-rerun and clear; local-only storage
- Deterministic verdict explanation line (Task 1): single “why” line per verdict from verdictExplanation.ts; no verdict or pipeline changes
- Data-driven toxic routing: always-toxic keywords, hazard aliases, and additive toxins extracted to toxicRouting.json; lookup code reads from data file instead of hardcoded values
- Composite schema annotations: foods.json entries annotated with type ("composite") and hazardPresence ("always" or "possible") where applicable

## Branch Reality
- main: earlier deterministic baseline
- feat-autocomplete: autocomplete + full intelligence pipeline (merged into phase branch)
- phase3-intelligence: historical; effectively equivalent to feat-autocomplete (not active)
- phase/trust-confidence: active phase branch (authoritative)

## Active Development Baseline
- phase/trust-confidence (authoritative)
- task/data-contracts-routing-composites (active work branch)

## Phase Status
- Trust & Confidence Surfacing: **Complete**
- Enhanced Verdict Explanations: **Complete** (Tasks 1 and 2 implemented; Task 3 satisfied by current structure)
- Deterministic Coverage Expansion: **In progress**

## Current Phase
Deterministic Coverage Expansion

**Phase Status:** In progress  
**Source of truth for this phase:** docs/PHASE_LOCAL_INTEL_ENHANCEMENT.MD

## Phase Goal
Increase answer fidelity by expanding deterministic local coverage and formalizing data contracts for routing and composites, reducing reliance on fallback, without introducing inference or new data sources.

## In Scope (this phase)
See docs/PHASE_LOCAL_INTEL_ENHANCEMENT.MD.

## Explicitly Out of Scope
See docs/PHASE_LOCAL_INTEL_ENHANCEMENT.MD.

## Next Task (authoritative)
Expand foods.json composites and aliases (curated)

## Handoff Snapshot

- **Current Phase:** Deterministic Coverage Expansion
- **Phase Status:** In progress
- **Last Completed Task:** Data contracts for routing and composites
- **Current Task:** None
- **Current Working Branch:** task/data-contracts-routing-composites
- **Next Task:** Expand foods.json composites and aliases (curated)
- **Phase source of truth:** docs/PHASE_LOCAL_INTEL_ENHANCEMENT.MD
- **Workflow roles:** Cursor implements code changes. ChatGPT provides guidance and review.
