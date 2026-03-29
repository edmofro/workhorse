---
title: Workflow quality gates and enforcement
area: workflow
status: draft
---

Ordering and quality constraints in the commit and completion workflows.

## Committing and status are independent

- [ ] Committing specs pushes the current spec content to the project's codebase — it does not change the card's status
- [ ] A card can be committed multiple times while in any status (iterative workflow)
- [ ] Status progression is an explicit user action via the status field on the card view
- [ ] The three statuses (Not started, Specifying, Spec complete) behave like column states — the user moves the card forward when they judge it ready
- [ ] The AI completeness assessment and auto-review inform the user's decision but do not gate the status change itself

## Dependency commit ordering

- [ ] When committing a card that depends on other cards, the system checks whether all parent cards have been committed
- [ ] If any parent card has not been committed, the commit is blocked with a clear message naming the uncommitted parent(s)
- [ ] The commit button tooltip or disabled state indicates the blocking dependency when applicable

## Dependency status ordering

- [ ] A card cannot move to Spec complete if any of its parent cards are not Spec complete
- [ ] Setting the status checks parent statuses and shows a blocking message if parents are incomplete
