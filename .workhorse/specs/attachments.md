---
title: Attachment support
area: core
card: WH-002
---

Users attach files — particularly screenshots, photos, and PDFs — across all input surfaces in Workhorse. Attachments are available as context to all AI agents.

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
- [ ] Clicking away from a description textarea does not close editing if uploads are still pending

## Inline display

### Card descriptions and comments

Attachments are stored as `![filename](/api/attachments/id)` markdown references in the description/comment text. MarkdownContent renders them inline.

- [ ] Attachments are embedded within the text flow — text can appear above and below an attachment, just as in Linear or Slab
- [ ] Image attachments render as block-level images between paragraphs, sized to fit the content width (rounded corners, subtle border with hover state)
- [ ] Non-image attachments (PDFs, etc.) render as a compact file chip (icon, filename) between paragraphs — MarkdownContent detects non-image extensions and renders a chip instead of a broken `<img>`
- [ ] There is no separate "Attachments" section — attachments live inside the rich text content at the position the user placed them
- [ ] Clicking an image opens the full-size image in a new tab
- [ ] Legacy fallback: cards with pre-existing description-level attachments not referenced inline still display as thumbnails below the description

### Chat messages

- [ ] Image attachments in chat messages appear as block-level images (max 400px wide) alongside the message
- [ ] Non-image attachments appear as file chips
- [ ] Clicking an image opens the full-size image

## Storage

Attachments are **not committed to the git repository**. They are stored on disk and served via the API.

- **Database:** `Attachment` model tracks metadata (filename, MIME type, size, storage path, associations)
- **Disk:** Files stored at `/data/attachments/{attachmentId}/{filename}` on persistent disk (configurable via `ATTACHMENTS_DIR` env var)

### Data model

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

### API routes

- `POST /api/attachments/upload` — Multipart form upload. Accepts `file` (required) and `cardId` (optional). Returns attachment metadata including a serving URL. Assigns default `pasted-image.{ext}` filename for clipboard pastes with generic names.
- `GET /api/attachments/[id]` — Serves the file from disk with correct Content-Type. Validates the storage path stays within the attachments directory and sandboxes SVGs with CSP headers.

## AI agent context

All attachments are passed to agents as base64 content blocks — they are read from disk at request time, not from the git worktree.

### Agent session

- [ ] Chat message attachments are passed as multimodal content blocks (base64 image + text) via `AsyncIterable<SDKUserMessage>` to the Agent SDK `query()` function
- [ ] Card-level attachments are loaded as content blocks in the first message of each agent session — images as image blocks, PDFs and other documents as document blocks
- [ ] Card-level attachments get a text label (`[Card attachments: file1.png, file2.pdf]`) so the agent knows what they are
- [ ] Capped at 10 attachments total per session start

### Generate-card agent

- [ ] When the card creation dialog includes image attachments, they're passed as multimodal content blocks to the Claude API call that generates the card title and description

### Implementation handoff

The implementation agent works from specs and mockups, not screenshots. Attachments are visual reference only, available in Workhorse's UI.

## Constraints

- [ ] Maximum file size is 10 MB per attachment
- [ ] Accepted file types: images (PNG, JPEG, GIF, WebP, SVG) and documents (PDF)
- [ ] The UI follows the existing design system (warm stone palette, no special treatment)
