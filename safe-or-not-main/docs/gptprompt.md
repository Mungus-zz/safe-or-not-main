# GPT Prompt — Enhanced Verdict Phase (Task-Level Guidance)

Using HANDOFF.md and STATE.md as authoritative sources, resume development.

Context:
- App: Safe or Not
- Current phase: Enhanced Verdict Explanations
- Authoritative branch: phase/trust-confidence
- Phase source of truth: docs/PHASE_ENHANCED_VERDICT.md
- Phase status: Staged
- Current task: Task 1 — Deterministic Explanation Mapping

Task intent:
Introduce deterministic, explainable verdict explanations that clarify *why* a verdict was returned, without adding intelligence or altering outcomes.

This task improves trust and clarity. It does not expand capability.

Hard constraints:
- Do NOT change verdict logic
- Do NOT change lookup pipeline order
- Do NOT add new data sources
- Do NOT add confidence scores, probabilities, or inference
- Do NOT add emergency actions or dose calculations
- Do NOT add education, long-form content, or summaries
- Explanations must be deterministic and derived from existing results only

Functional requirements (high level):
- Every verdict must have a concise explanation
- Explanation must be readable in under 5 seconds
- Explanation must explicitly state known hazards or uncertainty
- SAFE explanations must avoid absolute claims
- VET FIRST explanations must explain *why* verification failed or uncertainty exists
- TOXIC explanations must name the known toxic component when available

Workflow rules:
- Cursor is responsible for implementing all code changes
- ChatGPT is used for guidance, validation, and review only
- Do not assume prior chat context
- Ask before making any scope changes
- Treat the uploaded repo and docs as the source of truth

This chat will be used to guide and review Cursor implementation for Task 1 only.
