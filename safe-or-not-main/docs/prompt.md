## Task 1 — Deterministic Explanation Mapping

Context  
This task is part of the **Enhanced Verdict Explanations** phase.  
The phase source of truth is `docs/PHASE_ENHANCED_VERDICT.md`.

This task adds explainability only. It does not add intelligence.

ChatGPT is used for guidance and review only.  
Cursor is responsible for implementation.

---

### Goal
Create a deterministic explanation layer that produces a concise explanation for every verdict shown to the user.

---

### Hard constraints
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add inference, confidence scores, or probabilities
- Do NOT add emergency actions or dosing logic
- Do NOT introduce long-form or educational content

---

### Implementation requirements

1) Explanation mapping
- Create a deterministic explanation generator keyed by verdict and known result fields
- Explanations must not vary run-to-run for the same input
- Mapping must rely only on existing lookup results and failure modes

2) Explanation rules
- TOXIC: name the known toxic ingredient or hazard when available
- VET FIRST: explain the uncertainty or failure condition
- SAFE: explain absence of known hazards without absolute language

3) Output format
- Single concise explanation per verdict
- 1–2 sentences maximum
- No timelines, dosages, or instructions

4) UI integration
- Explanation appears on the verdict screen
- Must not compete with verdict typography
- No new screens or interactions

---

### Docs updates (required)
- Update docs/STATE.md to mark Task 1 as in progress or complete
- Add a dated Task 1 entry to docs/devlog.md
- Update docs/handoff.md with current task status

---

### Output
- List files changed
- Confirm verdict logic unchanged
- Confirm lookup pipeline unchanged
- Confirm explanations are deterministic and local
