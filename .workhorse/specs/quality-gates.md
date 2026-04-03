---
title: Workflow quality gates and enforcement
area: workflow
---

Ordering and quality constraints in the commit and status workflows.

## Committing and status are independent

- [ ] Committing specs pushes the current spec content to the project's codebase — it does not change the card's status
- [ ] A card can be committed multiple times while in any status (iterative workflow)
- [ ] Status progression is an explicit user action via the status field on the card view
- [ ] Statuses are configurable per project (see `workflow-orchestration.md`)
- [ ] The jockey's journal and suggestions inform the user's decision but do not gate the status change itself

## Soft gates on status transitions

- [ ] When the user advances a card's status, the system checks the card's journal (see `workflow-orchestration.md`) for whether relevant skills have been completed
- [ ] If a relevant skill has not run (e.g. spec review before moving to implementation), the user sees a prompt with the option to run it or skip
- [ ] All gates are skippable — the user always has the final say

## Dependency commit ordering

- [ ] When committing a card that depends on other cards, the system checks whether all parent cards have been committed
- [ ] If any parent card has not been committed, the commit is blocked with a clear message naming the uncommitted parent(s)
- [ ] The commit button tooltip or disabled state indicates the blocking dependency when applicable

## Dependency status ordering

- [ ] A card cannot advance past its parent cards' statuses
- [ ] Setting the status checks parent statuses and shows a blocking message if parents are incomplete
