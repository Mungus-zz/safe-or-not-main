Task 4: Add local history (last 10 checks) with rerun

Context
This task is part of the Trust & Confidence Surfacing phase. Intelligence is complete. This task surfaces past certainty without adding new capability.

ChatGPT is used for guidance and review only.
Cursor is responsible for implementation.

Goal
Add a small, local-only history of the last 10 food checks that users can tap to rerun.

Hard constraints
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add accounts, analytics, or cloud sync
- Do NOT add education or explanations
- Local-only storage

Implementation requirements

1) Storage
- Use AsyncStorage
- Store last 10 successful checks only
- Drop oldest entry when exceeding 10
- Store normalized input, canonical name, verdict, provenance, timestamp

2) Rerun behavior
- Tapping a history item reruns smartFoodLookup with the stored input
- Navigation and result handling identical to a fresh check
- Result cache may still apply normally

3) UI
- Minimal history list near input
- Show food name and verdict indicator
- Include a clear history action
- No redesign, no new screens

Docs updates (required)
- Update docs/STATE.md to mark Task 4 as in progress or implemented
- Add a dated Task 4 entry to docs/devlog.md
- Update docs/handoff.md with current phase, branch, and task status

Output
- List files changed
- Confirm verdict logic unchanged
- Confirm history is local only
