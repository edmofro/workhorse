'use client'

import { useState, useTransition } from 'react'
import { updateFeature } from '../../lib/actions/features'
import { Avatar } from '../Avatar'

interface FeatureData {
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
  activities: {
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { displayName: string } | null
  }[]
}

interface CardTabProps {
  feature: FeatureData
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

export function CardTab({ feature, users, teams }: CardTabProps) {
  const [title, setTitle] = useState(feature.title)
  const [description, setDescription] = useState(feature.description ?? '')
  const [, startTransition] = useTransition()

  function handleUpdate(data: Record<string, unknown>) {
    startTransition(async () => {
      await updateFeature(feature.id, data)
    })
  }

  function handleTitleBlur() {
    if (title !== feature.title && title.trim()) {
      handleUpdate({ title: title.trim() })
    }
  }

  function handleDescriptionBlur() {
    if (description !== (feature.description ?? '')) {
      handleUpdate({ description: description || null })
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

        {/* Metadata */}
        <div className="border-t border-[var(--border-subtle)] pt-6 space-y-4">
          <MetadataRow label="Status">
            <select
              value={feature.status}
              onChange={(e) => handleUpdate({ status: e.target.value })}
              className="text-[13px] bg-transparent border border-[var(--border-default)] rounded-[var(--radius-default)] px-2 py-1 outline-none focus:border-[var(--accent)] transition-[border-color] duration-150"
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
              value={feature.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              className="text-[13px] bg-transparent border border-[var(--border-default)] rounded-[var(--radius-default)] px-2 py-1 outline-none focus:border-[var(--accent)] transition-[border-color] duration-150"
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
              value={feature.team.id}
              onChange={(e) => handleUpdate({ teamId: e.target.value })}
              className="text-[13px] bg-transparent border border-[var(--border-default)] rounded-[var(--radius-default)] px-2 py-1 outline-none focus:border-[var(--accent)] transition-[border-color] duration-150"
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
              value={feature.assignee?.id ?? ''}
              onChange={(e) =>
                handleUpdate({
                  assigneeId: e.target.value || null,
                })
              }
              className="text-[13px] bg-transparent border border-[var(--border-default)] rounded-[var(--radius-default)] px-2 py-1 outline-none focus:border-[var(--accent)] transition-[border-color] duration-150"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </MetadataRow>

          {feature.dependsOn.length > 0 && (
            <MetadataRow label="Depends on">
              <div className="flex flex-wrap gap-2">
                {feature.dependsOn.map((dep) => (
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

        {/* Activity */}
        {feature.activities.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] mt-8 pt-6">
            <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-4">
              Activity
            </h3>
            <div className="space-y-3">
              {feature.activities.map((activity) => (
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
    <div className="flex items-center gap-4">
      <span className="w-[100px] shrink-0 text-[12px] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </div>
  )
}
