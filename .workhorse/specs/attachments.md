---
title: Attachment support
area: core
card: WH-002
---

Users attach files — particularly screenshots, photos, and PDFs — across all input surfaces in Workhorse. Attachments are available as context to all AI agents.

## Input surfaces

Attachments are supported on four surfaces:

- **Card creation dialog** — attach files alongside the prompt when creating a new card
- **Card description** — attach files to the card description
- **Card comments** — attach files to individual comments
- **Chat messages** — attach files to messages sent to the agent

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

## AI agent context

- [ ] When a chat message includes image attachments, the agent session receives them as multimodal content blocks (base64 images)
- [ ] Card-level attachments are included as content blocks in the first message of each agent session — images as image blocks, PDFs as document blocks
- [ ] Attachments are not committed to the git repository; they are stored on disk and served via the API
- [ ] When the card creation dialog includes image attachments, the generate-card agent receives them as visual context

## Constraints

- [ ] Maximum file size is 10 MB per attachment
- [ ] Accepted file types: images (PNG, JPEG, GIF, WebP, SVG) and documents (PDF)
