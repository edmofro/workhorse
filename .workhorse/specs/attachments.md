---
title: Attachment support
area: core
card: WH-002
---

Users attach files — particularly screenshots, photos, and PDFs — across all input surfaces in Workhorse. Attachments are available as context to all AI agents — the spec agent, the handoff/implementation agent, and the generate-card agent.

## Input surfaces

Attachments are supported on four surfaces:

- **Card creation dialog** — attach files alongside the prompt when creating a new card
- **Card description** — attach files to the card description (CardTab)
- **Card comments** — attach files to individual comments (CardTab)
- **Chat messages** — attach files to messages sent to the agent session (ChatInput)

## How to attach

Files can be attached via two mechanisms on all supported surfaces:

- [ ] A paperclip button opens a native file chooser
- [ ] Pasting from the clipboard (Ctrl+V / Cmd+V) while the input has focus attaches any image or file present in the clipboard
- [ ] Pasting a screenshot or copied image attaches it directly — no intermediate file-save step required
- [ ] If a pasted image has no filename, the system assigns a sensible default name (e.g. `pasted-image.png`)
- [ ] Pending attachments appear as removable thumbnails (images) or file chips (documents) in the compose area before sending
- [ ] Each pending attachment has a remove button

## Inline display

### Card descriptions and comments

- [ ] Attachments are embedded within the text flow — text can appear above and below an attachment, just as in Linear or Slab
- [ ] Image attachments render as a block-level image between paragraphs, sized to fit the content width
- [ ] Non-image attachments render as a compact file chip (icon, filename, file size) between paragraphs
- [ ] There is no separate "Attachments" section — attachments live inside the rich text content at the position the user placed them
- [ ] Clicking an image opens the full-size image

### Chat messages

- [ ] Image attachments in chat messages appear as thumbnails alongside the message
- [ ] Non-image attachments appear as file chips
- [ ] Clicking an image thumbnail opens the full-size image

## Storage

- **Database:** `Attachment` model tracks metadata (filename, MIME type, size, storage path, associations)
- **Disk:** Files stored at `/data/attachments/{attachmentId}/{filename}` on persistent disk
- **Worktree:** Image attachments are also copied into `.workhorse/attachments/{card-id}/` in the card's git worktree, making them available to both the agent session and the implementation agent via handoff

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

## AI agent context

### Agent session

- [ ] When a chat message includes image attachments, the agent session API constructs multimodal content blocks (base64 image + text) and passes them via `AsyncIterable<SDKUserMessage>` to the Agent SDK `query()` function
- [ ] Card-level attachments are included as content blocks in the first message of each agent session — images as image blocks, PDFs as document blocks
- [ ] Card description attachments are mentioned in the session prompt context so the agent is aware of them and can read them from the worktree

### Handoff / implementation agent

- [ ] Attachments copied to `.workhorse/attachments/{card-id}/` in the worktree are committed and pushed, so they're available to external Claude Code sessions
- [ ] The handoff prompt includes attachment file paths

### Generate-card agent

- [ ] When the card creation dialog includes image attachments, they're passed as multimodal content blocks to the Claude API call that generates the card title and description

## UI components

### AttachmentButton

A paperclip button that triggers a hidden file input. Accepts images and common document types. Shows a count badge when files are selected.

### AttachmentPreview

Displays attached files as thumbnails (for images) or file icons (for documents). Supports removal of pending attachments. Used in ChatInput, CardTab comments, and CreateCardDialog.

### ChatMessage

Image attachments in messages are rendered inline as thumbnails that can be clicked to view full-size.

## Constraints

- [ ] Maximum file size is 10 MB per attachment
- [ ] Accepted file types: images (PNG, JPEG, GIF, WebP, SVG) and documents (PDF)
- [ ] The UI follows the existing design system (warm stone palette, no special treatment)
