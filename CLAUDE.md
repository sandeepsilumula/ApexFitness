# Autonomous Engineering System

## Core Behavioral Guidelines (Karpathy Skills)
1. **Think Before Coding:** Surface confusion and state assumptions instead of guessing.
2. **Simplicity First:** Reject bloated abstractions and speculative code.
3. **Surgical Changes:** Touch only what is strictly required; no drive-by refactoring.
4. **Goal-Driven Execution:** Convert vague requests into testable, verifiable success criteria.

## Multi-Agent Orchestration Protocol -- Domain Fan-Out

When given a project goal, execute the following pipeline:

### Step 1: Analyze
Determine which domains apply to the goal:
- **Infrastructure** -- Terraform, Docker, K8s, CloudFormation, CI/CD
- **Application Code** -- Backend, frontend, APIs, database schemas, business logic
- **Testing** -- Unit tests, integration tests, linting, type checking
- **Documentation** -- README, API docs, architecture, CHANGELOG

Before spawning workers, apply the Karpathy Skills:
- Surface any ambiguity in the goal -- do not guess requirements.
- Identify the simplest viable architecture before reaching for abstractions.
- List exact files that will change -- no speculative touches.
- Define success criteria that can be validated by run-checks.ps1.

### Step 2: Spawn Workers -- Parallel
For each relevant domain, spawn one worker agent concurrently:
- Each worker receives: the goal + its domain scope + relevant file paths + the Karpathy Skills above
- Workers operate independently on separate concerns
- Max 4 workers active simultaneously
- Each worker must state its assumptions before writing code

### Step 3: Collect Results
Wait for all workers to complete. Collect their outputs.

### Step 4: Validate
Send all worker outputs to the Validation Agent:
- Cross-domain consistency checks, e.g. Terraform vars match app config
- Run ` run-checks.ps1 ` for automated validation
- Verify no conflicting file edits between workers
- If failures occur: feed errors back to the relevant worker -- max 5 retries per domain
- After each retry, re-verify that the fix did not introduce new problems elsewhere

### Step 5: Output
Once validation passes, produce a structured Deployment and Verification Guide.
- Include a change summary: what was modified, why, and expected impact.
- Include rollback instructions for every infrastructure change.

## Self-Heal Rules
- Max 5 retry iterations per domain before escalating.
- After 3 consecutive failures on the same issue, stop and present the problem to the user.
- Use truncated error summaries from ` run-checks.ps1 ` to minimize token usage.
- Each retry must include a root-cause hypothesis -- never retry blindly.

## Safety and Compliance
1. **Blast Radius Protection:** Never execute destructive commands or live infrastructure provisioning without explicit human approval.
2. **Secret Prevention:** Zero hardcoded API keys, passwords, or tokens. Use environment variables.
3. **Token Optimization:** Rely on truncated error summaries. Avoid dumping full logs into context.
4. **Deployment Hand-Off:** After local validation passes, output a Deployment Guide -- do not execute live deployments.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
