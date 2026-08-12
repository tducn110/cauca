# CLI Prompt Contract (Agent Orchestration)

When interacting with this repository via AI/Agents, the following workflow and contract must be strictly adhered to:

1. **No Guessing**:
   - All assessments and claims must point to specific files, lines, or command outputs.

2. **Phase 1: Baseline & Assessment**:
   - Read the repository context before making changes.
   - Run type checks, tests, and build commands to establish a baseline. Store initial outputs and capture the current error list without fixing them immediately.

3. **Phase 2: Planning (`PLAN.md`)**:
   - Always create a `PLAN.md` before modifying code.
   - The plan must include: issues, severity (P0/P1/P2), target files, planned tests, rollback strategies, and task dependencies.

4. **Phase 3: Implementation**:
   - Make small, single-purpose commits. Do not edit the same file across multiple agents without coordinating/rebasing.
   - Do not use blanket catch statements; recover state or fail fast.
   - Run relevant tests after every P0 fix.

5. **Phase 4: Integration**:
   - Review diffs carefully. Remove silent catches, console spam, duplicate utilities, and dead imports.
   - Do not evaluate a task as "done" until `typecheck`, `test`, and `build` pass, and Network 404s are verified absent. Execute a manual QA matrix.

6. **Phase 5: Final Reports**:
   - Provide explicit reports on completion, including:
     - `FINAL_AUDIT.md`
     - `CHANGELOG.md`
     - `DELETE_CANDIDATES.md` (if applicable)
     - `RISK_REGISTER.md`
     - Remaining unfixed issues and justifications.
