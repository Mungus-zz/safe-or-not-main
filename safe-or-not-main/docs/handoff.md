The foolproof continuity protocol (use this every time)

**Current staging (Data contracts complete)**  
- **Phase:** Deterministic Coverage Expansion  
- **Source of truth:** docs/PHASE_LOCAL_INTEL_ENHANCEMENT.MD  
- **Phase status:** In progress  
- **Branches:** Authoritative phase branch: phase/trust-confidence, Active work branch: task/data-contracts-routing-composites  
- **Task status:** Last completed: Data contracts for routing and composites. Current task: None. Next task: Expand foods.json composites and aliases (curated)  
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