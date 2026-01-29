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

## Branch Reality
- main: earlier deterministic baseline
- feat-autocomplete: autocomplete + full intelligence pipeline
- phase3-intelligence: effectively equivalent to feat-autocomplete

## Active Development Baseline
- feat-autocomplete (authoritative)

## Current Phase
Trust & Confidence Surfacing

## Phase Goal
Make existing correct answers feel inevitable, calm, and trustworthy without adding new capability.

## In Scope (this phase)
- Confidence and provenance surfacing
- Deterministic explanation unification
- Honest trust language
- Local history (private utility)
- UI microcopy refinement
- Network resilience polish

## Explicitly Out of Scope
- New intelligence or data sources
- New verdict logic
- Emergency features
- Reports or exports
- Accounts or cloud sync
- Educational content

## Next Task (authoritative)
Surface confidence label and honest trust line on verdict screen.
