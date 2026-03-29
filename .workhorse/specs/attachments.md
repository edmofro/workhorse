---
title: Attachment support
area: core
card: n/a
status: draft
---

## Description

Add the ability to attach files (particularly photos and screenshots) across all input surfaces in Workhorse. Attachments should be available as context to all AI agents — the spec interview agent, the handoff/implementation agent, and the generate-card agent.

## Surfaces

1. **Card creation dialog** — Attach files alongside the prompt when creating a new card
2. **Card description** — Attach files to the card description (CardTab)
3. **Card comments** — Attach files to comments (CardTab)
4. **Interview chat** — Attach files to messages sent to the spec interview agent (ChatInput)

## Storage

- **Database:** `Attachment` model tracks metadata (filename, MIME type, size, storage path, associations)
- **Disk:** Files stored at `/data/attachments/{attachmentId}/{filename}` on persistent disk
- **Worktree:** Image attachments are also copied into `.workhorse/attachments/{card-id}/` in the card's git worktree, making them available to both the interview agent and the implementation agent via handoff

## Data model

```
Attachment
  id          String (cuid)
  cardId      String?         → Card (description-level or chat attachment)
  commentId   String?         → CardComment
  fileName    String
  mimeType    String
  fileSize    Int
  storagePath String          (path on disk)
  createdAt   DateTime
```

- Card-level attachments: `cardId` set, `commentId` null
- Comment attachments: both `cardId` and `commentId` set

## API routes

- `POST /api/attachments/upload` — Multipart form upload. Accepts `file` (required) and `cardId` (optional). Returns attachment metadata including a serving URL.
- `GET /api/attachments/[id]` — Serves the file with correct Content-Type. Used for rendering previews in the UI.

## AI agent integration

### Spec interview agent

- When a chat message includes image attachments, the interview API constructs multimodal content blocks (base64 image + text) and passes them via `AsyncIterable<SDKUserMessage>` to the Agent SDK `query()` function.
- Card description attachments are mentioned in the interview prompt context so the agent is aware of them and can read them from the worktree.

### Handoff / implementation agent

- Attachments copied to `.workhorse/attachments/{card-id}/` in the worktree are committed and pushed, so they're available to external Claude Code sessions.
- The handoff prompt includes attachment file paths.

### Generate-card agent

- When the card creation dialog includes image attachments, they're passed as multimodal content blocks to the Claude API call that generates the card title and description.

## UI components

### AttachmentButton

A paperclip button that triggers a hidden file input. Accepts images and common document types. Shows a count badge when files are selected.

### AttachmentPreview

Displays attached files as thumbnails (for images) or file icons (for documents). Supports removal of pending attachments. Used in ChatInput, CardTab comments, and CreateCardDialog.

### ChatMessage

Image attachments in messages are rendered inline as thumbnails that can be clicked to view full-size.

## Acceptance criteria

- [ ] Users can attach files (images, screenshots) when creating a card
- [ ] Users can attach files to the card description
- [ ] Users can attach files to card comments
- [ ] Users can attach files to interview chat messages
- [ ] Image attachments display as thumbnails in all surfaces
- [ ] Clicking a thumbnail opens the full-size image
- [ ] The spec interview agent receives image attachments as multimodal content blocks
- [ ] Card description attachments are copied to the worktree and available to the interview agent
- [ ] The handoff prompt references attachment files in the worktree
- [ ] The generate-card API receives image attachments when creating a card with attached files
- [ ] File size is limited to 10 MB per file
- [ ] Only common file types are accepted (images: png, jpg, gif, webp, svg; documents: pdf)
- [ ] Attachment previews can be removed before sending
- [ ] The UI follows the existing design system (warm stone palette, no special treatment)
