# Global Engineering Agent Protocol

This repository uses a system-thinking engineering workflow.

The agent must understand the system before changing it.

Core sequence:

```text
CLASSIFY TASK
→ INSPECT CONTEXT
→ DEFINE PROBLEM
→ COLLECT EVIDENCE
→ MAP SYSTEM
→ TRACE CAUSAL CHAIN
→ IDENTIFY OWNERSHIP
→ FIND ROOT CAUSE
→ REVIEW TRADE-OFFS
→ IMPLEMENT AT THE CORRECT OWNER
→ VERIFY BY RISK LEVEL
→ REPORT EVIDENCE HONESTLY
```

Do not solution-first.

Do not treat symptoms as root causes.

Do not present inference as evidence.

---

# 1. TASK MODE

Every task must first be classified into exactly one primary mode.

```text
REVIEW_ONLY
IMPLEMENT
DEBUG
EXPLAIN
```

## REVIEW_ONLY

Use when the request is primarily:

```text
review
inspect
audit
analyze
compare
evaluate
trace
check architecture
```

Rules:

* Do not modify files.
* Inspect source/runtime/context.
* Produce findings with evidence.
* Recommendations remain recommendations.

---

## IMPLEMENT

Use when the user asks to:

```text
fix
change
add
remove
refactor
migrate
build
implement
optimize
```

Rules:

* Inspect before editing.
* Trace ownership/root cause first.
* Make the smallest coherent change at the correct owner.
* Verify after modification.

If the request clearly asks to change the project, default to `IMPLEMENT`.

---

## DEBUG

Use when the primary task is diagnosing an observed failure.

Examples:

```text
crash
wrong behavior
lag
audio spam
visual glitch
responsive bug
state desync
runtime exception
```

Debug sequence:

```text
REPRODUCE
→ TRACE
→ ISOLATE
→ ROOT CAUSE
→ FIX
→ VERIFY REPRODUCTION CASE
```

Do not patch the visible symptom before locating its upstream mechanism.

---

## EXPLAIN

Use when the user wants to understand:

```text
how something works
why behavior occurs
architecture
data flow
lifecycle
concept
comparison
```

Do not change source unless separately requested.

---

# 2. CONTEXT INSPECTION

Before changing non-trivial code, inspect the current environment.

Minimum context:

```text
repository
working directory
branch
HEAD
git status
package manager
relevant package/framework versions
architecture
runtime flow
relevant files
state owner
lifecycle owner
existing tests
existing user changes
```

Never assume the working tree is clean.

Always distinguish:

```text
existing user changes

vs

changes introduced by this task
```

Do not reset, discard, overwrite, stash, or rewrite existing user changes unless explicitly requested.

---

# 3. CONTEXT CONFIDENCE

Before producing a final diagnosis classify confidence:

```text
HIGH
MEDIUM
LOW
```

Check:

```text
Symptom known?
Expected behavior known?
Actual behavior verified?
Relevant source inspected?
Runtime context known?
State owner known?
Lifecycle owner known?
External contract known?
```

If confidence is LOW and guessing could materially change the solution:

Do not produce a complete architectural fix.

Report:

```text
Known:
Missing:
Why the missing context matters:
Files/logs/runtime evidence required:
```

Ask at most 1–3 high-value questions.

Do not request the whole repository when one subsystem is enough.

---

# 4. PROBLEM DEFINITION

Before solving a non-trivial problem write internally or explicitly:

```text
Symptom
Expected behavior
Actual behavior
Impact
Scope
Out of scope
```

Do not confuse symptom with cause.

Bad:

```text
Game lags
→ too many objects
```

Better:

```text
SYMPTOM
Frame time spikes during rapid slicing

↓

IMMEDIATE CAUSE
Particle allocation repeatedly scans occupied pool entries

↓

SYSTEM CAUSE
Pool has storage ownership but no efficient free-slot allocation

↓

ROOT CAUSE
Allocation strategy is incompatible with burst spawn behavior
```

---

# 5. SOURCE EVIDENCE

For important files inspected during a non-trivial task, reason using:

```text
FILE
ROLE
EVIDENCE
ISSUE
CONFIDENCE
```

Example:

```text
FILE
src/audio/AudioManager.ts

ROLE
Owns SFX playback and voice lifecycle.

EVIDENCE
playSfx() creates a new voice during every trigger.

ISSUE
Rapid slice events can exceed intended voice concurrency.

CONFIDENCE
High
```

Do not dump every file in the repository.

Only record files relevant to the current causal chain.

---

# 6. EVIDENCE TYPES

Every important conclusion belongs to one category:

```text
[A] Source evidence
[B] Official documentation
[C] Inference
[D] Recommendation
```

## [A] Source evidence

Examples:

```text
source code
git diff
runtime log
profiler measurement
test result
network trace
device observation
```

## [B] Official documentation

Use when behavior depends on:

```text
framework
library
browser
API
SDK
runtime
version-specific behavior
```

Priority:

```text
official docs
→ specification/source
→ maintainer documentation
→ other sources
```

If official documentation cannot be found:

```text
Không tìm thấy tài liệu chính thức xác nhận điểm này.
```

## [C] Inference

Reasoning supported by evidence but not directly observed.

Never present inference as measured fact.

## [D] Recommendation

A proposed change based on evidence and trade-offs.

Recommendation is not evidence.

---

# 7. SYSTEM THINKING

Analyze the relevant subsystem as:

```text
INPUT
→ PROCESS
→ STATE
→ EVENT
→ SIDE EFFECT
→ OUTPUT
→ FEEDBACK
```

Identify:

```text
components
actors
dependencies
state
events
data flow
control flow
side effects
constraints
bottlenecks
feedback loops
```

Always ask:

```text
1. Where is the single source of truth?

2. Who mutates the state?

3. Who owns the lifecycle?

4. Who owns the side effect?

5. Is a business rule duplicated?

6. Is the dependency direction correct?

7. Is the visible symptom caused upstream?

8. Are multiple components competing for ownership?

9. Does derived state accidentally become authoritative state?
```

---

# 8. OWNERSHIP

Every important responsibility must have a clear owner.

Distinguish:

```text
STATE OWNER
LIFECYCLE OWNER
BUSINESS-RULE OWNER
RENDER OWNER
SIDE-EFFECT OWNER
PERSISTENCE OWNER
NETWORK/API OWNER
```

One component does not need to own everything.

But two components must not independently own the same truth.

Bad:

```text
React state
+
Pixi state
+
localStorage
+
SDK state

all behave as authoritative state
```

Preferred:

```text
AUTHORITATIVE STATE
        ↓
DERIVED STATE
        ↓
PRESENTATION
```

---

# 9. DEPENDENCY DIRECTION

Dependencies must follow architectural ownership.

Generic direction:

```text
External Platform
        ↓
Adapter / Integration
        ↓
Application
        ↓
Domain Rules
```

For game rendering:

```text
Game State
    ↓
Runtime / Renderer
    ↓
Visual Output
```

Do not introduce reverse dependencies merely because they make a patch convenient.

---

# 10. GAME OWNERSHIP DEFAULTS

Unless the repository defines otherwise:

## Pure game/domain logic owns

```text
rules
score calculation
win/loss rules
board rules
economy formulas
deterministic state transitions
```

Pure game logic should not require:

```text
React
Pixi
DOM
browser storage
platform SDK transport
```

---

## Pixi/runtime owns

```text
Application
Canvas
Stage
Ticker
render loop
sprites
textures
particles
continuous animations
per-frame transforms
render-time positions
continuous input state
runtime visual lifecycle
```

Avoid pushing per-frame Pixi state into React.

---

## React owns

```text
application shell
screen navigation
menus
HUD
modal/overlay UI
settings UI
committed presentation state
```

React should generally not own:

```text
ticker
RAF
particle position
sprite transform every frame
continuous collision state
per-frame pointer state
```

---

## Integration adapters own

```text
SDK calls
platform lifecycle
leaderboard transport
score submission
host events
capabilities
external API translation
```

External calls should not be scattered through gameplay code.

---

# 11. RUNTIME TRACE

For runtime bugs, trace the smallest relevant chain.

Example:

```text
Pointer Input
→ Slice Detection
→ SliceResult
→ Gameplay Event
→ AudioManager
→ Voice Allocation
→ Playback
→ Cleanup
```

Do not expand scope unnecessarily.

If the problem is audio spam, do not redesign:

```text
leaderboard
deployment
responsive system
routing
```

unless evidence connects them to the problem.

---

# 12. ROOT CAUSE

Before patching, trace:

```text
Symptom
Expected behavior
Actual behavior
Immediate cause
System cause
Root cause
State owner
Lifecycle owner
Duplicated rule / duplicated source of truth
Dependency direction
```

Canonical chain:

```text
SYMPTOM
↓
IMMEDIATE CAUSE
↓
SYSTEM CAUSE
↓
ROOT CAUSE
```

Do not stop at:

```text
too many objects
too many rerenders
Safari issue
audio issue
large assets
bad performance
```

Explain the mechanism.

---

# 13. ALTERNATIVES AND TRADE-OFFS

Only compare realistic alternatives.

For each serious option inspect:

```text
What problem does it solve?
Benefits
Trade-offs
Complexity
Performance impact
Maintainability
Migration cost
Failure modes
When should it be used?
When should it NOT be used?
```

Do not manufacture alternatives merely to make a table larger.

---

# 14. PRE-PATCH REVIEW GATE

Before structural changes confirm:

```text
Problem understood?
Expected behavior known?
Actual behavior verified?

Immediate cause identified?
System cause identified?
Root cause supported?

State owner identified?
Lifecycle owner identified?
Single source of truth identified?
Dependency direction understood?

Relevant files inspected?
Existing user changes protected?
Scope boundaries understood?

Official docs checked where needed?
Inference separated from fact?

Proposed change targets the correct owner?
Regression risks identified?
```

If critical answers are unknown:

Do not start a large refactor.

Gather evidence first.

---

# 15. CHANGE DISCIPLINE

Prefer the smallest coherent change that fixes the system cause.

Do not optimize for:

```text
fewest edited lines
```

Optimize for:

```text
correct ownership
clear source of truth
correct dependency direction
minimal behavioral scope
```

Do not perform unrelated cleanup during a focused fix.

Do not mass rewrite a subsystem when a smaller ownership correction solves the problem.

---

# 16. DIRTY WORKTREE SAFETY

Existing modifications belong to the user unless proven otherwise.

Never automatically:

```text
git reset
git checkout .
git restore .
git clean
git stash
```

Do not overwrite unrelated dirty files.

If a required file already contains user changes:

inspect and preserve them.

---

# 17. PROHIBITED EXTERNAL ACTIONS

Unless explicitly requested, do not:

```text
commit
push
deploy
create branch
open merge request
send message
publish package
modify remote infrastructure
```

Local implementation and verification are allowed when requested.

---

# 18. VERIFICATION BY RISK LEVEL

Verification depth must match the risk of the change.

---

## LEVEL 1 — Local Behavior

Use for isolated pure logic.

Examples:

```text
utility
formula
parser
pure function
small deterministic rule
```

Typical verification:

```text
targeted unit tests
```

---

## LEVEL 2 — Typed / Module Integration

Use when a change crosses module boundaries but stays within the application runtime.

Typical verification:

```text
targeted tests
typecheck
lint if relevant
build if relevant
```

---

## LEVEL 3 — Cross-Subsystem / Production Feature

Use when changing:

```text
game lifecycle
state ownership
SDK integration
navigation
persistence
asset loading
audio architecture
render ownership
```

Typical verification:

```text
unit tests
integration tests
typecheck
build
runtime flow verification where available
```

---

## LEVEL 4 — Runtime / Device Boundary

Required when correctness depends on:

```text
browser behavior
Safari/iOS
audio autoplay
WebGL
visual rendering
responsive layout
performance
network timing
mobile input
physical device behavior
```

Level 4 cannot be proven by:

```text
unit tests
typecheck
build
```

alone.

Required evidence may include:

```text
browser runtime
device test
performance trace
visual inspection
network trace
audio behavior
interaction reproduction
```

If not performed:

```text
NOT VERIFIED
```

Do not silently downgrade Level 4 requirements to Level 2 evidence.

---

# 19. PERFORMANCE CLAIM DISCIPLINE

Separate:

```text
CPU
GPU
memory
network
decode
GPU upload
draw calls
texture binds
layout
render
GC
allocation
```

Do not treat them as interchangeable.

Static source inspection may suggest a performance cause.

It does not prove runtime performance.

If metrics are unavailable, report:

```text
NOT MEASURED
```

Do not invent benchmark numbers.

---

# 20. IMPLEMENTATION ORDER

Do not begin with random file edits.

Preferred order:

```text
1. Ownership / authority
2. State model
3. Lifecycle
4. Data/event flow
5. Side effects / adapters
6. Module boundaries
7. Migration
8. Code
9. Tests
10. Runtime verification
```

Establish the backbone before polishing leaves.

---

# 21. VERIFICATION DOES NOT GENERALIZE

Evidence only proves the boundary actually tested.

Examples:

```text
build passes
≠ browser behavior verified

typecheck passes
≠ runtime lifecycle verified

unit tests pass
≠ integration verified

Chrome passes
≠ Safari passes

desktop passes
≠ mobile passes

simulation passes
≠ physical device passes

code inspection
≠ performance measurement
```

Always state the real verification boundary.

---

# 22. CLAIM DISCIPLINE

Preferred language:

```text
Source evidence shows...
Runtime measurement shows...
Official documentation specifies...
This suggests...
This remains an inference...
Not measured...
Not verified on device...
```

Do not say:

```text
100% fixed
fully optimized
production ready
works on every device
zero risk
guaranteed
```

unless corresponding evidence exists.

---

# 23. FINAL REPORT — REVIEW_ONLY / DEBUG

Use a structure appropriate to the task, but preserve traceability.

Recommended:

```text
[S0] Context confidence

[S1] Problem
Symptom
Expected
Actual
Impact
Scope

[S2] Current system / ownership

[S3] Evidence
[A]
[B]
[C]

[S4] Root cause

[S5] Alternatives / trade-offs

[S6] Recommendation

[S7] Risks / verification required
```

---

# 24. FINAL REPORT — IMPLEMENT

Every implementation report must clearly include:

```text
CHANGED FILES

VERIFIED

NOT VERIFIED

REMAINING RISKS
```

Also report when relevant:

```text
Task mode:
Problem/root cause:
Behavior changed:
Tests:
Typecheck:
Lint:
Build:
Runtime verification:
Device verification:
```

Do not hide failed checks.

Do not convert missing verification into PASS.

---

# 25. TRACEABILITY

For large analyses, use stable section IDs:

```text
[S0]
[S1]
[S2]
...
```

Reference earlier conclusions rather than explaining everything repeatedly.

Example:

```text
As established in [S4], AudioManager owns voice lifecycle.
```

---

# 26. FOCUS RULE

Stay inside the smallest subsystem that explains the behavior.

Example:

```text
Slice SFX spam

Input
→ collision/slice detection
→ SliceResult
→ event dispatch
→ AudioManager
→ voice lifecycle
→ cleanup
```

Do not drift into unrelated systems merely because they exist in the repository.

---

# 27. REPOSITORY-SPECIFIC CONTRACTS

This protocol is the generic engineering layer.

Repository-specific constraints belong below this section or in dedicated documents.

Examples:

```text
Wink SDK Contract
Asset Loading Contract
Audio Contract
Responsive Acceptance Contract
i18n Contract
Product Scope Checklist
```

Repository contracts may add constraints.

They must not weaken:

```text
evidence discipline
ownership rules
source-of-truth discipline
dirty-worktree safety
verification requirements
```

---

# 28. CORE RULE

The final engineering loop is:

```text
CLASSIFY
↓
UNDERSTAND
↓
DEFINE
↓
INSPECT
↓
MAP
↓
VERIFY
↓
TRACE OWNERSHIP
↓
ROOT CAUSE
↓
TRADE-OFF
↓
IMPLEMENT
↓
VERIFY BY RISK
↓
REPORT HONESTLY
```

A patch that merely makes the symptom disappear is not complete if ownership, source of truth, lifecycle, or contract boundaries remain wrong.
