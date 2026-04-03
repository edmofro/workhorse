'use client'

import { useState, useRef, useEffect, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import { updateCard, addComment } from '../../lib/actions/cards'
import { associateAttachmentsWithCard } from '../../lib/actions/attachments'
import { Avatar } from '../Avatar'
import { StatusDot } from '../StatusDot'
import { Tag } from '../Tag'
import { PropertyDropdown, usePortalMenu, type PropertyOption } from '../PropertyDropdown'
import { useUser } from '../UserProvider'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { AttachmentButton } from './AttachmentButton'
import { AttachmentPreview } from './AttachmentPreview'
import { STATUS_OPTIONS } from '../../lib/status'
import { cn } from '../../lib/cn'

interface CardAttachment {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
}

interface CardData {
  id: string
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  tags: string
  team: { id: string; name: string; colour: string }
  assignee: { id: string; displayName: string } | null
  dependsOn: { identifier: string; title: string }[]
  attachments: CardAttachment[]
  comments: {
    id: string
    content: string
    createdAt: string
    user: { displayName: string; avatarUrl?: string | null }
    attachments: CardAttachment[]
  }[]
  activities: {
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { displayName: string } | null
  }[]
}

interface CardTabProps {
  card: CardData
  users: { id: string; displayName: string }[]
  teams: { id: string; name: string; colour: string }[]
}

const PRIORITY_OPTIONS: PropertyOption[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const VISIBLE_TAG_COUNT = 3

type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled'

function statusToDotState(status: string): StatusDotState {
  switch (status) {
    case 'NOT_STARTED': return 'not-started'
    case 'SPECIFYING': return 'specifying'
    case 'IMPLEMENTING': return 'implementing'
    case 'COMPLETE': return 'complete'
    case 'CANCELLED': return 'cancelled'
    default: return 'not-started'
  }
}

function toAttachmentData(att: CardAttachment) {
  return {
    id: att.id,
    fileName: att.fileName,
    mimeType: att.mimeType,
    fileSize: att.fileSize,
    url: `/api/attachments/${att.id}`,
  }
}

/** Portal dropdown listing hidden overflow tags, each with a remove button. */
function TagOverflowDropdown({
  tags,
  onRemove,
}: {
  tags: string[]
  onRemove: (tag: string) => void
}) {
  const { open, toggle, triggerRef, menuRef, pos } = usePortalMenu()

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className="inline-flex items-center px-2 py-1 rounded-[var(--radius-md)] text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
      >
        +{tags.length} more
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="z-50 min-w-[140px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
          >
            {tags.map((tag) => (
              <div
                key={tag}
                className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors duration-100"
              >
                <Tag variant={tag === 'future' ? 'future' : 'core'}>
                  {tag}
                </Tag>
                <button
                  onClick={() => onRemove(tag)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer ml-3"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

export function CardTab({ card, users, teams }: CardTabProps) {
  const { user } = useUser()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [status, setStatus] = useState(card.status)
  const [priority, setPriority] = useState(card.priority)
  const [teamId, setTeamId] = useState(card.team.id)
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id ?? '')
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [, startTransition] = useTransition()

  const tagInputRef = useRef<HTMLInputElement>(null)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)
  // Prevents the blur event firing after Enter from re-submitting the tag
  const tagCommittingRef = useRef(false)

  const descAttachments = useAttachments(card.id)
  const commentAttachments = useAttachments(card.id)

  const tags: string[] = useMemo(() => {
    try { return JSON.parse(card.tags) } catch { return [] }
  }, [card.tags])

  const visibleTags = tags.slice(0, VISIBLE_TAG_COUNT)
  const hiddenTags = tags.slice(VISIBLE_TAG_COUNT)

  // Build dropdown option lists — memoised since they depend on stable props
  const statusOptions = useMemo<PropertyOption[]>(() => (
    STATUS_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      icon: <StatusDot state={statusToDotState(opt.value)} />,
    }))
  ), [])

  const teamOptions = useMemo<PropertyOption[]>(() => (
    teams.map((t) => ({ value: t.id, label: t.name }))
  ), [teams])

  const assigneeOptions = useMemo<PropertyOption[]>(() => ([
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: u.displayName })),
  ]), [users])

  // Derive display labels from local state so they stay current after changes
  const currentStatusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  const currentPriorityLabel = PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority
  const currentTeamName = teams.find((t) => t.id === teamId)?.name ?? card.team.name
  const currentAssigneeName = users.find((u) => u.id === assigneeId)?.displayName ?? 'Unassigned'

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus()
  }, [addingTag])

  // Size the description textarea to fit its content whenever description changes
  // (covers initial mount with existing content and subsequent edits)
  useEffect(() => {
    const el = descTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [description])

  function handleUpdate(data: Record<string, unknown>) {
    startTransition(async () => {
      await updateCard(card.id, data)
    })
  }

  function handleTitleBlur() {
    if (title !== card.title && title.trim()) {
      handleUpdate({ title: title.trim() })
    }
  }

  function handleDescriptionBlur() {
    if (description !== (card.description ?? '')) {
      handleUpdate({ description: description || null })
    }
    const uploaded = descAttachments.getUploadedAttachments()
    if (uploaded.length > 0) {
      startTransition(async () => {
        await associateAttachmentsWithCard(card.id, uploaded.map((a) => a.id))
      })
      descAttachments.clear()
    }
  }

  function commitTag() {
    const tag = newTag.trim()
    setNewTag('')
    setAddingTag(false)
    if (!tag || tags.includes(tag)) return
    handleUpdate({ tags: [...tags, tag] })
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      tagCommittingRef.current = true
      commitTag()
    }
    if (e.key === 'Escape') {
      tagCommittingRef.current = true
      setNewTag('')
      setAddingTag(false)
    }
  }

  function handleTagBlur() {
    if (tagCommittingRef.current) {
      tagCommittingRef.current = false
      return
    }
    commitTag()
  }

  function handleRemoveTag(tagToRemove: string) {
    handleUpdate({ tags: tags.filter((t) => t !== tagToRemove) })
  }

  function handleAddComment() {
    const content = newComment.trim()
    const uploaded = commentAttachments.getUploadedAttachments()
    if (!content && uploaded.length === 0) return
    startTransition(async () => {
      try {
        await addComment(card.id, content, uploaded.map((a) => a.id))
        setNewComment('')
        commentAttachments.clear()
      } catch (error) {
        console.error('Failed to add comment:', error)
      }
    })
  }

  function handleCommentKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  return (
    <div>
      <div className="max-w-[720px] mx-auto" style={{ padding: '32px 40px 16px' }}>
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-[24px] font-bold tracking-[-0.03em] leading-[1.3] bg-transparent border-none outline-none mb-3"
        />

        {/* Property strip */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-5 -mx-2">
          {/* Status */}
          <PropertyDropdown
            trigger={
              <>
                <StatusDot state={statusToDotState(status)} />
                {currentStatusLabel}
              </>
            }
            options={statusOptions}
            value={status}
            onChange={(val) => {
              setStatus(val)
              handleUpdate({ status: val })
            }}
          />

          {/* Priority */}
          <PropertyDropdown
            trigger={currentPriorityLabel}
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(val) => {
              setPriority(val)
              handleUpdate({ priority: val })
            }}
          />

          {/* Team */}
          <PropertyDropdown
            trigger={currentTeamName}
            options={teamOptions}
            value={teamId}
            onChange={(val) => {
              setTeamId(val)
              handleUpdate({ teamId: val })
            }}
          />

          {/* Assignee */}
          <PropertyDropdown
            trigger={currentAssigneeName}
            options={assigneeOptions}
            value={assigneeId}
            onChange={(val) => {
              setAssigneeId(val)
              handleUpdate({ assigneeId: val || null })
            }}
          />

          {/* Depends on — display only */}
          {card.dependsOn.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1">
              {card.dependsOn.map((dep) => (
                <span
                  key={dep.identifier}
                  className="text-[11px] font-medium font-mono text-[var(--text-muted)]"
                  title={dep.title}
                >
                  {dep.identifier}
                </span>
              ))}
            </div>
          )}

          {/* Divider before tags */}
          <span className="px-1 text-[12px] text-[var(--text-faint)] select-none">·</span>

          {/* Visible tags — variant logic matches the board's Tag component */}
          {visibleTags.map((tag) => (
            <Tag
              key={tag}
              variant={tag === 'future' ? 'future' : 'core'}
              className="gap-1 cursor-default"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:opacity-60 cursor-pointer leading-none"
              >
                <X size={9} />
              </button>
            </Tag>
          ))}

          {/* +N more overflow */}
          {hiddenTags.length > 0 && (
            <TagOverflowDropdown tags={hiddenTags} onRemove={handleRemoveTag} />
          )}

          {/* Add tag */}
          {addingTag ? (
            <input
              ref={tagInputRef}
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleTagBlur}
              placeholder="tag name"
              className="px-2 py-1 text-[11px] font-medium bg-transparent border border-[var(--border-subtle)] rounded-[var(--radius-md)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-100 w-[90px] placeholder:text-[var(--text-faint)]"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)]',
                'text-[11px] font-medium text-[var(--text-muted)]',
                'hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer',
              )}
            >
              <Plus size={10} />
              tag
            </button>
          )}
        </div>

        {/* Description — grows with content */}
        <textarea
          ref={descTextareaRef}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onBlur={handleDescriptionBlur}
          placeholder="Add a description..."
          rows={3}
          className="w-full text-[14px] text-[var(--text-secondary)] leading-[1.7] bg-transparent border-none outline-none resize-none overflow-y-hidden mb-2 placeholder:text-[var(--text-faint)]"
        />

        {/* Description attachments */}
        <div className="mb-8">
          {card.attachments.length > 0 && (
            <div className="mb-2">
              <AttachmentPreview saved={card.attachments.map(toAttachmentData)} />
            </div>
          )}
          {descAttachments.hasAttachments && (
            <div className="mb-2">
              <AttachmentPreview
                pending={descAttachments.pending}
                onRemovePending={descAttachments.removeAttachment}
              />
            </div>
          )}
          <AttachmentButton onFiles={descAttachments.addFiles} compact />
        </div>

        {/* Comments */}
        <div className="border-t border-[var(--border-subtle)] mt-4 pt-6">
          <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-4">
            Comments
          </h3>

          {card.comments.length > 0 && (
            <div className="space-y-4 mb-4">
              {card.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar
                    variant="human"
                    initial={comment.user.displayName}
                    avatarUrl={comment.user.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-[2px]">
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        {comment.user.displayName}
                      </span>
                      <span className="text-[11px] text-[var(--text-faint)]">
                        {new Date(comment.createdAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-[1.6]">
                      {comment.content}
                    </p>
                    {comment.attachments.length > 0 && (
                      <div className="mt-2">
                        <AttachmentPreview
                          saved={comment.attachments.map(toAttachmentData)}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <div className="flex items-start gap-2">
            <Avatar variant="human" initial={user.displayName} size="sm" />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                placeholder="Add a comment..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none"
              />
              {commentAttachments.hasAttachments && (
                <div className="mt-2">
                  <AttachmentPreview
                    pending={commentAttachments.pending}
                    onRemovePending={commentAttachments.removeAttachment}
                    compact
                  />
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <AttachmentButton onFiles={commentAttachments.addFiles} compact />
                {(newComment.trim() || commentAttachments.hasAttachments) && (
                  <button
                    onClick={handleAddComment}
                    disabled={commentAttachments.isUploading}
                    className="px-3 py-[5px] text-[12px] font-medium bg-[var(--accent)] text-white rounded-[var(--radius-default)] hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-40"
                  >
                    Comment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
