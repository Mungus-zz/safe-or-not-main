# Safe or Not (iOS)

Safe or Not is a thin, single-purpose iOS app that gives instant guidance on whether a food is safe for pets.

This repository contains the **MVP flow only**.

---

## What this app does

Safe or Not is designed for moments of uncertainty:

- A pet grabs something off the floor  
- A child feeds a dog or cat something questionable  
- An owner needs an answer immediately  

The app provides **one clear response**, then gets out of the way.

Open → enter food → get verdict → close.

---

## MVP Scope (current)

This version focuses on **flow and experience**, not data completeness.

### Included
- 3-screen onboarding (shown once)
- Input screen for entering a food
- Verdict screen
- Local persistence for onboarding completion

### Not included (by design)
- No food database yet
- No real safety logic yet
- No monetization or paywall
- No profiles, tracking, history, or settings
- No backend or external APIs

For MVP testing, all inputs currently return **VET FIRST**.

This allows us to validate UX and navigation without locking in premature logic or data models.

---

## Design philosophy

- Thin over complete  
- Clear over clever  
- Calm over emotional  
- Tool, not wellness app  

The UI is intentionally minimal and stable so future iterations can change **logic underneath** without redesigning screens.

---

## Planned iteration path

This project is intended to evolve in phases:

1. **Flow MVP** (current)
2. Local food safety dataset + conservative verdict logic
3. Expanded coverage and synonym handling
4. Optional monetization layer (paywall)
5. Source attribution and trust refinements

UI should remain largely unchanged across these phases.

---

## Tech notes

- Built as a screenshot clone from Figma using RORK
- No backend dependencies
- No network calls
- Simple local state only

---

## Status

🚧 Early MVP  
Focused on validating flow and interaction before adding data or monetization.

---

## License

TBD
