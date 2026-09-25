---
name: heal
description: Triggers the full Domain Fan-Out orchestration pipeline with self-healing validation
---

Execute the full autonomous orchestration and self-healing pipeline:

## Phase 1: Orchestrate
1. Analyze the current project goal.
2. Identify relevant domains -- Infrastructure, Application, Testing, Documentation.
3. Spawn one worker per domain in parallel.
4. Each worker modifies its domain independently.

## Phase 2: Validate
1. Run un-checks.ps1 for automated checks.
2. The Validator Agent performs cross-domain consistency checks.
3. If failures occur, route errors back to the relevant domain worker.

## Phase 3: Self-Heal Loop
1. Re-run validation after each fix iteration.
2. Max 5 retry iterations total.
3. After 3 consecutive failures on the same issue, stop and present the problem to the user.
4. Once all gates pass, produce the Deployment and Verification Guide.