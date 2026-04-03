---
title: Workflow orchestration
area: workflow
---

Cards progress through a flexible workflow powered by three concepts: **skills** (actions that can be performed), the **jockey** (an observer that tracks progress and suggests next steps), and the **journey** (a visible record of what's happened and what's ahead). These work together to support workflows ranging from a quick bug fix (implement → PR) to a full feature lifecycle (workshop → interview → review → implement → audit → PR) without requiring the user to configure or choose a workflow shape upfront.

## Skills

A skill is an action that can be performed on a card. Skills are the atomic unit of doing things in Workhorse. Each skill has a name, an execution mode, and a trigger mechanism.

### Execution modes

- **Inline** — runs in the card's primary conversation. The agent adopts the skill's behaviour (e.g. interview mode, implementation mode) within the ongoing chat thread.
- **Subagent** — forks a separate AI context with no conversation history, runs independently, and posts a summary back to the primary conversation as a system message. The primary agent sees the summary and can work through the findings with the user.

### Triggering skills

Skills can be triggered from multiple surfaces:

- [ ] **Pills** — contextual action buttons above the chat input. Clicking a pill triggers the corresponding skill
- [ ] **Journey bar** — clicking a suggested item in the journey bar starts that skill immediately. Alternatively, the user can schedule it to run automatically after the current step completes (see "Scheduling" under Journey bar)

### Built-in skills

- [ ] **Workshop** (inline) — open-ended ideation and back-and-forth exploration of an idea. The agent explores approaches, generates mockups to illustrate concepts, and helps refine thinking
- [ ] **Interview** (inline) — structured spec interview. The agent asks probing questions, surfaces edge cases, and challenges assumptions. Focuses on one or two questions at a time. Proactively generates mockups for UI-heavy features
- [ ] **Draft spec** (inline) — the agent reads the card description and codebase context, then generates a complete spec draft. Less interactive than interview — produces output, then asks for feedback
- [ ] **Review spec** (subagent) — fresh-eyes review with no conversation history (see `auto-review.md`). Checks for gaps, contradictions, cross-spec impact, and information architecture issues. Posts findings as a system message
- [ ] **Implement** (inline) — the agent reads specs, diffs against main, and implements the acceptance criteria. A long-running session where the agent writes code
- [ ] **Design audit** (subagent) — reviews implementation against the project's design system in `.workhorse/design/`, covering both high-level principles and pixel-level detail
- [ ] **Security audit** (subagent) — reviews implementation for OWASP top 10, injection vulnerabilities, auth/authz issues, data exposure, input validation
- [ ] **Code review** (subagent) — reviews implementation code against the spec acceptance criteria. Focuses on whether the code correctly implements the spec
- [ ] **Create PR** (inline) — creates a GitHub pull request from the card's branch. The agent decides the PR title and description; the backend executes the GitHub API call using the user's OAuth token (same pattern as auto-commit). Links the PR to the card
- [ ] **Fix CI** (inline) — reads CI failure output, diagnoses the issue, and pushes fixes. Runs when auto-fix is enabled and CI fails on the card's PR
- [ ] **Update spec** (inline) — the agent updates spec files to reflect the current state of the implementation or new decisions made during development

### Custom skills

Projects can define custom skills as prompt files in `.workhorse/skills/`. Each file defines a skill with a name, execution mode, and prompt.

- [ ] Custom skills appear alongside built-in skills — the jockey can suggest them in pills and in the journey bar
- [ ] A custom skill can define a tailored prompt for a specific project need (e.g. "review all acceptance criteria against the codebase and flag any that are already implemented")
- [ ] Custom skills use the same execution modes as built-in skills (inline, subagent)

### Skills and agent modes

Each inline skill maps to a system prompt fragment that shapes the agent's behaviour. The mode flows from the skill trigger → API → system prompt builder. The agent receives mode-specific instructions alongside the user's message, so it knows to conduct an interview, or implement from specs, or follow directed editing instructions.

## The jockey

The jockey is a lightweight observer that watches the card's conversation and maintains an awareness of where things are. It runs on every message (user or agent), decides whether anything noteworthy just happened, and keeps the journey and pill suggestions current.

Named after the rider who guides a workhorse — it doesn't do the work, but it knows where the work is headed.

### When the jockey runs

The jockey runs a Haiku LLM pass in response to two kinds of trigger:

- [ ] **Every message** (user or agent) posted to the conversation
- [ ] **External state changes** detected by background polling — new commits on the card's branch, PR status updates, CI results

Both triggers feed into the same assessment. The jockey reads the new input (message, or description of the external change) plus a few recent messages for context, against the current journal.

### What the jockey does on each pass

- [ ] Decides whether anything noteworthy just happened — did something finish? Did something start? Has the user's intent shifted? Did an external event change the picture?
- [ ] Writes journal entries when warranted (see "Journal" section)
- [ ] Updates the suggested steps in the journey bar
- [ ] Updates pill suggestions — the most relevant 2-4 actions for right now
- [ ] Starts the next scheduled skill if the current step just completed (see "Scheduling" under Journey bar)
- [ ] Detects when the conversation diverges from the spec (e.g. user directs the agent to implement something the spec doesn't cover) and surfaces "Update spec" in pills

Most of the time, the assessment is "nothing noteworthy happened" and no changes are made. The jockey receives the journal (which provides a compressed history of the card's progress) plus a sliding window of recent conversation for context. A cursor tracks which messages have already been assessed, so the jockey knows what's new — but the context window extends further back than just the new messages, so it can recognise significance that only becomes apparent in hindsight.

### Pills vs suggestions

These are both generated by the jockey but serve different purposes:

- **Suggestions** (in the journey bar) are the expected remaining sequence of steps. Linear — "here's what's probably ahead." Example during implementation: Design audit → Code review → Create PR.
- **Pills** (above the chat input) are branching options for what to do right now. They may include actions not in the suggestions. Example during implementation: "Continue implementing", "Update spec", "Design audit."

## Journal

The journal is the single record of what's happened on a card, visible in the journey bar. The jockey writes journal entries; the primary agent does not manage the journal.

### Journal entries

Each entry has:

- [ ] **Type** — what kind of thing happened (e.g. workshop, interview, spec-draft, spec-review, implementation, design-audit, pr-created)
- [ ] **Timestamp** — when it happened
- [ ] **Summary** — a brief human-readable description (e.g. "Spec interview completed — 2 specs written, 1 open question remaining")

### Characteristics

- [ ] Entries are recorded in the order things happened, reflecting reality
- [ ] Out-of-order workflows are normal — a spec update entry can appear after implementation entries if the spec was revised during implementation
- [ ] The journal is append-only. Entries are never rewritten or reordered
- [ ] The journal is the input the jockey uses to determine suggestions and pills

## Journey bar

The journey bar is the visual representation of the journal. It sits between the topbar and the chat area, always visible in a compact collapsed state, expandable to show the full journey.

### Collapsed state

```
┌──────────────────────────────────────────────────────────────┐
│  ✓ ✓ ● ◌ ◌   Implementing                            ▾     │
└──────────────────────────────────────────────────────────────┘
```

- [ ] Shows progress dots: solid (✓) for completed steps, filled (●) for active step, hollow (◌) for suggested next steps
- [ ] Current step label beside the dots
- [ ] Expand chevron (▾) on the right
- [ ] The journey bar does not appear on fresh cards with no completed steps. It appears after the first journal entry is written

### Expanded state

The expanded journey overlays the top of the chat area. It's meant to be opened briefly and closed — not left open during normal work.

```
┌──────────────────────────────────────────────────────────────┐
│  ✓ Spec interview              2 Apr                        │
│  ✓ Spec review                 3 Apr                        │
│  ● Implementing                In progress                  │
│                                                              │
│  Scheduled                                                   │
│  ○ Design audit                                        ✕     │
│  ○ Code review                                         ✕     │
│                                                              │
│  Suggestions                                                     │
│  ◌ Create PR                                          ▴     │
└──────────────────────────────────────────────────────────────┘
```

- [ ] Completed entries show at full opacity with timestamps
- [ ] Scheduled items use a solid outline circle (○) — visually distinct from the dotted/hollow suggested items (◌), communicating that these are committed to
- [ ] Suggested items under "Suggestions" are visually muted (lower opacity, dotted/hollow icons) to communicate that they are the jockey's guesses, not commitments
- [ ] Clicking a suggested step triggers that skill immediately (same as clicking a pill)
- [ ] Clicking a completed step does nothing
- [ ] The overlay closes when the user clicks outside it, presses Escape, or triggers an action

### Scheduling

Users can schedule suggested steps to run automatically in sequence, rather than triggering them one at a time.

- [ ] Each suggested item has a "schedule" affordance (e.g. a secondary action alongside the click-to-start-now behaviour)
- [ ] Scheduling an item moves it from "Suggestions" into the "Scheduled" section
- [ ] Scheduled items run in order: when the jockey assesses that the current step has completed, it auto-starts the next scheduled item
- [ ] Each scheduled item has a cancel (✕) button to remove it from the schedule and return it to "Suggestions"
- [ ] Multiple instances of the same skill can be scheduled in sequence (e.g. design audit, resolve findings, design audit again)
- [ ] The collapsed journey bar reflects scheduled items with solid outline dots, distinct from the dotted suggested dots

## PR bar

A bottom bar that appears when code changes exist outside the `.workhorse/` directory. It provides direct access to PR creation and management without going through the conversation.

### Pre-PR state

```
┌──────────────────────────────────────────────────────────────┐
│                                                [Create PR]   │
└──────────────────────────────────────────────────────────────┘
```

- [ ] Appears as soon as the card's branch has changes to files outside `.workhorse/`
- [ ] Single action: Create PR. Triggers the create-pr skill

### Post-PR state

```
┌──────────────────────────────────────────────────────────────┐
│                                         [View PR ↗]   [···] │
└──────────────────────────────────────────────────────────────┘
```

- [ ] "View PR" opens the GitHub PR in a new tab
- [ ] Overflow menu (···) contains: Auto fix toggle. When enabled, the fix-ci skill runs automatically when CI fails on the PR

## Handoff

A button in the topbar that generates a context-rich briefing prompt for an external agent (Claude Code, Cursor, or any other AI tool). Always available — works at any stage of the card's lifecycle.

### The briefing prompt

The prompt explains the Workhorse system and gives the card's context, but does not prescribe a task. The human tells the external agent what to do.

- [ ] Explains where specs live (`.workhorse/specs/`), where the design system is (`.workhorse/design/design-system.md`), where mockups are (`.workhorse/design/mockups/`)
- [ ] Instructs the external agent to diff the card branch against main to understand what specs and mockups have been added or changed
- [ ] Includes a journal summary — what's happened so far on this card
- [ ] Notes any open questions from the specs
- [ ] If the card has implementation work, instructs the agent that code changes should meet the spec acceptance criteria
- [ ] The prompt is concise — it teaches the external agent how to find information, rather than inlining all content

### UX

- [ ] A handoff button in the topbar (alongside the card title and other actions)
- [ ] One click copies the prompt to the clipboard
- [ ] A toast confirms: "Handoff prompt copied"

## Card statuses

Card statuses are decoupled from skills and the journey. Any skill can be triggered in any status. The jockey's suggestions are based on the journal (what has actually happened) rather than the card's status.

- [ ] Statuses are configurable per project (not hardcoded)
- [ ] The jockey may suggest status changes based on the journal (e.g. "Implementation and review are done — move to Complete?") but the user always makes the decision
- [ ] Skills are available regardless of status — a card in "Specifying" status can run a design audit if the user wants to

## Cross-references

- `auto-review.md` — the spec-review skill uses the fresh-eyes review mechanism defined there
- `agent-sdk-session.md` — skills use the same Agent SDK infrastructure and system prompt injection described there; inline skills run in the card's primary session, subagent skills run in ephemeral sessions
- `card-navigation.md` — the journey bar and PR bar are new UI elements in the card workspace; pills are now generated by the jockey rather than hardcoded by status
- `conversation-sessions.md` — the primary conversation model remains; subagent skills create ephemeral sessions that post results back to the primary conversation
- `commit-specs.md` — auto-commit behaviour continues to apply to all file changes made by skills
- `quality-gates.md` — soft gates are informed by the journal (whether review/audit skills have run) rather than separate boolean flags
