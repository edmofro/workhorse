---
title: "Card deletion"
area: "cards"
status: "draft"
---

Card deletion permanently removes all associated data. Deleted cards are not recoverable.

## Entry points

- [ ] Delete action is available from the team board (via card context menu or card actions)
- [ ] Delete action is available from within the open card workspace
- [ ] Any user with access to the card can delete it

## Confirmation

- [ ] Deleting a card always requires explicit confirmation — no single-click deletion
- [ ] The confirmation prompt makes clear that deletion is permanent and cannot be undone
- [ ] If the card has no dependents, the prompt shows the card title and asks the user to confirm

## Dependency warning

- [ ] If other cards depend on the card being deleted, the confirmation prompt lists those dependent cards by name
- [ ] The user is warned that deleting will remove the dependency link from those cards
- [ ] The user can still confirm and proceed — deletion is not blocked
- [ ] On confirmation, the dependency links are removed from all dependent cards

## What is deleted

- [ ] The card record is removed and no longer appears anywhere in the interface — team board, spec explorer, or search results
- [ ] The card's spec branch is deleted from the repository
- [ ] All specs and mockups committed only to that branch are lost
- [ ] Conversation sessions associated with the card are deleted

## Specs on the main branch

- [ ] If any of the card's spec changes have already been merged to main, those merged specs are not affected by card deletion