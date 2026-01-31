The foolproof continuity protocol (use this every time)

**Current staging (Task 2 in progress)**  
- **Phase:** Enhanced Verdict Explanations  
- **Source of truth:** docs/PHASE_ENHANCED_VERDICT.md  
- **Phase status:** In progress (Task 1 complete, Task 2 active)  
- **Branches:** Authoritative phase branch: phase/trust-confidence. Current working branch: task/hazard-grounding  
- **Task status:** Last completed: Task 1 — Deterministic Explanation Mapping. Current: Task 2 — Hazard Grounding  
- **Workflow:** Cursor implements. ChatGPT guides and reviews.

---

A. What you upload (always)
1️⃣ Canonical phase branch (required)

Upload as ZIP:

phase/trust-confidence (or whatever phase is active)

This is the source of truth.

2️⃣ Any divergent feature branches (optional but recommended)

Only if they exist and matter:

feat/autocomplete

anything not yet merged

Upload as ZIP only if unmerged.

Rule:
If a branch is merged into the phase branch, do not upload it separately.

3️⃣ Docs folder (required)

Upload these files explicitly:

docs/STATE.md

docs/devlog.md

docs/DECISIONS.md (if present)

any phase specific .md files

These are your human memory layer.

ChatGPT acts as the guide, Cursor implements the working code