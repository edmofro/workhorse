'use client'

import { useState, useTransition } from 'react'
import { updateCard, addComment } from '../../lib/actions/cards'
import { Avatar } from '../Avatar'
import { useUser } from '../UserProvider'
import { X, Plus } from 'lucide-react'

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
  comments: {
    id: string
    content: string
    createdAt: string
    user: { displayName: string; avatarUrl?: string | null }
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

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'SPECIFYING', label: 'Specifying' },
  { value: 'SPEC_COMPLETE', label: 'Spec complete' },
]

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

export function CardTab({ card, users, teams }: CardTabProps) {
  const { user } = useUser()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [newTag, setNewTag] = useState('')
  const [newComment, setNewComment] = useState('')
  const [, startTransition] = useTransition()

  const tags: string[] = (() => {
    try {
      return JSON.parse(card.tags)
    } catch {
      return []
    }
  })()

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
  }

  function handleAddTag() {
    const tag = newTag.trim()
    if (!tag || tags.includes(tag)) return
    const updatedTags = [...tags, tag]
    handleUpdate({ tags: updatedTags })
    setNewTag('')
  }

  function handleRemoveTag(tagToRemove: string) {
    const updatedTags = tags.filter((t) => t !== tagToRemove)
    handleUpdate({ tags: updatedTags })
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  function handleAddComment() {
    const content = newComment.trim()
    if (!content) return
    startTransition(async () => {
      await addComment(card.id, user.id, content)
    })
    setNewComment('')
  }

  function handleCommentKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto" style={{ padding: '32px 40px 80px' }}>
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-[24px] font-bold tracking-[-0.03em] leading-[1.3] bg-transparent border-none outline-none mb-2"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Add a description..."
          rows={3}
          className="w-full text-[14px] text-[var(--text-secondary)] leading-[1.75] bg-transparent border-none outline-none resize-none mb-8 placeholder:text-[var(--text-faint)]"
        />

        {/* Metadata — compact rows */}
        <div className="border-t border-[var(--border-subtle)] pt-5 space-y-3">
          <MetadataRow label="Status">
            <select
              value={card.status}
              onChange={(e) => handleUpdate({ status: e.target.value })}
              className="text-[13px] bg-transparent border-none outline-none cursor-pointer text-[var(--text-secondary)] appearance-none pr-4"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </MetadataRow>

          <MetadataRow label="Priority">
            <select
              value={card.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              className="text-[13px] bg-transparent border-none outline-none cursor-pointer text-[var(--text-secondary)] appearance-none pr-4"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </MetadataRow>

          <MetadataRow label="Team">
            <select
              value={card.team.id}
              onChange={(e) => handleUpdate({ teamId: e.target.value })}
              className="text-[13px] bg-transparent border-none outline-none cursor-pointer text-[var(--text-secondary)] appearance-none pr-4"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </MetadataRow>

          <MetadataRow label="Assignee">
            <select
              value={card.assignee?.id ?? ''}
              onChange={(e) =>
                handleUpdate({
                  assigneeId: e.target.value || null,
                })
              }
              className="text-[13px] bg-transparent border-none outline-none cursor-pointer text-[var(--text-secondary)] appearance-none pr-4"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </MetadataRow>

          {card.dependsOn.length > 0 && (
            <MetadataRow label="Depends on">
              <div className="flex flex-wrap gap-[6px]">
                {card.dependsOn.map((dep) => (
                  <span
                    key={dep.identifier}
                    className="inline-flex items-center gap-1 px-2 py-[2px] text-[12px] bg-[var(--bg-inset)] rounded-[var(--radius-default)] text-[var(--text-secondary)]"
                  >
                    <span className="font-mono text-[var(--text-muted)]">
                      {dep.identifier}
                    </span>
                    {dep.title}
                  </span>
                ))}
              </div>
            </MetadataRow>
          )}
        </div>

        {/* Tags */}
        <div className="border-t border-[var(--border-subtle)] mt-8 pt-6">
          <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">
            Tags
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-[3px] text-[12px] bg-[var(--bg-inset)] rounded-[var(--radius-default)] text-[var(--text-secondary)]"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer ml-[2px]"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                className="px-2 py-[3px] text-[12px] bg-transparent border border-[var(--border-subtle)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-150 w-[100px] placeholder:text-[var(--text-faint)]"
              />
              {newTag.trim() && (
                <button
                  onClick={handleAddTag}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="border-t border-[var(--border-subtle)] mt-8 pt-6">
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <div className="flex items-start gap-2">
            <Avatar
              variant="human"
              initial={user.displayName}
              size="sm"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                placeholder="Add a comment..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none"
              />
              {newComment.trim() && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddComment}
                    className="px-3 py-[5px] text-[12px] font-medium bg-[var(--accent)] text-white rounded-[var(--radius-default)] hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
                  >
                    Comment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity */}
        {card.activities.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] mt-8 pt-6">
            <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-4">
              Activity
            </h3>
            <div className="space-y-3">
              {card.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2">
                  {activity.user ? (
                    <Avatar
                      variant="human"
                      initial={activity.user.displayName}
                      size="sm"
                    />
                  ) : (
                    <Avatar variant="ai" size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {activity.user?.displayName ?? 'System'}{' '}
                      <span className="text-[var(--text-muted)]">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {new Date(activity.createdAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetadataRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center">
      <span className="w-[88px] shrink-0 text-[12px] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </div>
  )
}
