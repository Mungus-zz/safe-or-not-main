The foolproof continuity protocol (use this every time)

**Current staging (next phase staged)**  
- **Phase:** Enhanced Verdict Explanations (staged)  
- **Source of truth:** docs/PHASE_ENHANCED_VERDICT.md  
- **Phase status:** Staged  
- **Branches:** Authoritative phase branch: phase/trust-confidence  
- **Task status:** Last completed: Task 6 — Network resilience. Current task: None. Next task: Task 1 — Deterministic Explanation Mapping  
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