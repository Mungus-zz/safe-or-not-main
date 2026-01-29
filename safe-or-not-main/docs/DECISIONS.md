# Architectural Decisions

- The app is a tool, not a platform
- Core loop is type food → get verdict → exit
- Dogs only (cats deferred for now, though all vet sources cover dogs and catss)
- Deterministic data always precedes AI
- AI is used only for ingredient extraction, never verdicts
- USDA is used only for explicit ingredient lists
- Always-toxic hazards override all other logic
- Unknowns fail closed to VET FIRST
- Autocomplete is local and deterministic
- Intelligence expansion is complete; focus is now trust surfacing
- No education screens
- No accounts or analytics
- One active development branch at a time
