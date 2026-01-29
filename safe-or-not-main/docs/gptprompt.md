Using HANDOFF.md and STATE.md as authoritative sources, resume development.

Context:
- App: Safe or Not
- Current phase: Trust & Confidence Surfacing
- Authoritative phase branch: phase/trust-confidence
- Current working branch: task/local-history
- Last completed task: Task 3 — Unified explanation and action copy (provenance-honest)
- Current task: Task 4 — Add local history (last 10 checks) with rerun

Task intent:
Introduce a small, local-only history utility that surfaces the last 10 food checks.
This is a trust and friction-reduction feature, not an engagement feature.

Hard constraints:
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add accounts, analytics, or cloud sync
- Do NOT add education, summaries, or statistics
- History must be local only and capped at 10 entries

Functional requirements (high level):
- Store last 10 successful checks locally
- Display food name and verdict
- Tap to rerun lookup using existing pipeline
- Provide a clear history action
- No new screens; minimal UI changes only

Workflow rules:
- Cursor is responsible for implementing all code changes
- ChatGPT is used for guidance, validation, and review only
- Do not assume prior chat context
- Ask before making any scope changes
- Treat the uploaded repo and docs as the source of truth

This chat will be used to guide and review Cursor implementation.
