Safe or Not

Safe or Not is a calm, single purpose mobile app that helps pet owners quickly determine whether a food is safe, toxic, or requires veterinary guidance for pets.

The app is intentionally minimal and conservative. It prioritizes clarity, trust, and emotional steadiness at moments when users may be uncertain or stressed.

Current Version

v0.4.0

Phase 2 complete: visual polish, motion, and microcopy refinement.

Core Purpose

Help pet owners answer one question clearly and responsibly:

Is this food safe for my pet?

No dashboards.
No tracking.
No gamification.
No self help tone.

Just a clear answer.

How It Works

The user enters a food name

The app returns one of three verdicts:

SAFE

TOXIC

VET FIRST

Users can immediately check another food if needed

The flow is linear, fast, and interruption free.

Data Model

Local JSON based dataset

Conservative classifications only

Unknown or ambiguous foods always default to VET FIRST

Synonym support and normalized input matching

Tolerant of punctuation, casing, and spacing

Species specific coverage where applicable

Source attribution included for each food

There are no backend calls and no network dependencies.

Design Philosophy
Visual Design

Warm modern pet brand aesthetic

Off white backgrounds to avoid clinical starkness

Soft elevated surfaces for input and actions

Restrained, accessible verdict colors

Strong text contrast and readable typography

No decorative or distracting UI

The design favors calm authority over friendliness or playfulness.

Motion & Interaction

Subtle fade and vertical motion for screen transitions

Motion reinforces continuity, never urgency

Verdicts are revealed with composed pacing

Back navigation feels lighter and dismissive

Centralized motion tokens ensure consistency

No flashy animations. No bounce effects.

Microcopy

Human, reassuring phrasing without changing meaning

CTAs framed as guidance, not commands

Navigation language is contextual

No emotional manipulation or self help framing

Copy is intentionally neutral and trust forward.

Architecture

Built with Expo and expo router

Clean separation of concerns

Centralized design tokens for:

Colors

Typography

Spacing

Radius

Shadows

Motion

No backend

No analytics

No tracking

No notifications

The codebase is stable, readable, and future extensible.

What v0.4.0 Represents

MVP fully functional

Visual identity locked

Motion language established

Microcopy refined

Phase 2 complete

This version serves as a solid long term foundation. Future work can focus on intelligence, dataset expansion, or monetization without reworking core UX or visuals.

Future Directions (Not Implemented)

Expanded food dataset

Veterinary intelligence or LLM integration

Monetization experiments

Regional or species specific guidance

These are intentionally deferred until after validation.

License

Private project. All rights reserved.
