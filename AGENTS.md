# Local execution rules

This file defines the local-only documentation flow for this Worker project.

## Resuming work

Resume in this order: `docs/dashboard/NOW.md` → the linked feature `SPEC.md` and `STATE.md` → task `GOAL.md` and `CHECKLIST.md` → code and verification evidence. Conversation context is never a source of truth.

## State transitions

Use only these dashboard transitions: `OTHER` → `PLAN` → `NOW` → `DONE`. A feature may be in one state only. Update `NOW.md` in the same turn when a follow-up changes scope, phase, or result, and refresh it before every uninterrupted 10-minute work boundary.

## Records

Record Plan/Do/Check/Act explicitly in the active task. Each feature has `REQUEST.md`, `SPEC.md`, and `STATE.md`; preserve a redacted original request in `REQUEST.md`. UI-capable work also updates the state matrix and uses the UI review rubric for visible changes.
