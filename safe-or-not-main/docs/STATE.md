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
- Deterministic verdict explanation line (Task 1): single "why" line per verdict from verdictExplanation.ts; no verdict or pipeline changes
- Hazard grounding support (Task 2): deterministic display of up to two known hazards for TOXIC and VET FIRST verdicts when hazards already exist; SAFE unchanged

## Branch Reality
- main: earlier deterministic baseline
- feat-autocomplete: autocomplete + full intelligence pipeline (merged into phase branch)
- phase3-intelligence: historical; effectively equivalent to feat-autocomplete (not active)
- phase/trust-confidence: active phase branch (authoritative)

## Active Development Baseline
- phase/trust-confidence (authoritative)

## Phase Status
- Trust & Confidence Surfacing: **Complete**
- Enhanced Verdict Explanations: **In progress** (Task 1 complete)

## Current Phase
Enhanced Verdict Explanations

**Phase Status:** In progress.  
**Source of truth for this phase:** docs/PHASE_ENHANCED_VERDICT.md

## Phase Goal
See docs/PHASE_ENHANCED_VERDICT.md for phase goal, tasks, and constraints.

## In Scope (this phase)
See docs/PHASE_ENHANCED_VERDICT.md.

## Explicitly Out of Scope
See docs/PHASE_ENHANCED_VERDICT.md.

## Next Task (authoritative)
Task 2 — Hazard Grounding (see docs/PHASE_ENHANCED_VERDICT.md)

## Handoff Snapshot

- **Current Phase:** Enhanced Verdict Explanations
- **Phase Status:** In progress (Task 1 complete)
- **Last Completed Task:** Task 1 — Deterministic Explanation Mapping
- **Current Task:** Task 2 — Hazard Grounding
- **Current Working Branch:** task/hazard-grounding
- **Next Task:** TBD
- **Phase source of truth:** docs/PHASE_ENHANCED_VERDICT.md
- **Workflow roles:** Cursor implements code changes. ChatGPT provides guidance and review.
