'use client'

import { useState, useTransition, useRef, useCallback, useMemo } from 'react'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { useUser } from './UserProvider'
import { updateUser } from '../lib/actions/user'
import { createProject, updateProject, deleteProject } from '../lib/actions/projects'
import { createTeam, updateTeam, deleteTeam } from '../lib/actions/teams'
import { Trash2, Plus } from 'lucide-react'
import { RepoPickerDialog } from './RepoPickerDialog'

interface TeamData {
  id: string
  name: string
  colour: string
}

interface ProjectData {
  id: string
  name: string
  githubUrl: string
  owner: string
  repoName: string
  defaultBranch: string
  teams: TeamData[]
}

interface SettingsFormProps {
  projects: ProjectData[]
}

export function SettingsForm({ projects: initialProjects }: SettingsFormProps) {
  const { user, setUser } = useUser()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [projects, setProjects] = useState(initialProjects)
  const [isPending, startTransition] = useTransition()
  const [showRepoPicker, setShowRepoPicker] = useState(false)
  const existingRepoUrls = useMemo(() => new Set(projects.map((p) => p.githubUrl)), [projects])
  const projectSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleUpdateName() {
    if (!displayName.trim() || displayName === user.displayName) return
    startTransition(async () => {
      const updated = await updateUser(user.id, displayName.trim())
      setUser({ ...user, displayName: updated.displayName })
    })
  }

  function handleAddProjectFromRepo(repo: {
    name: string
    owner: string
    htmlUrl: string
    defaultBranch: string
  }) {
    setShowRepoPicker(false)
    startTransition(async () => {
      const project = await createProject({
        name: repo.name,
        githubUrl: repo.htmlUrl,
        owner: repo.owner,
        repoName: repo.name,
        defaultBranch: repo.defaultBranch,
      })
      setProjects((prev) => [
        ...prev,
        { ...project, teams: [] },
      ])
    })
  }

  const debouncedUpdateProject = useCallback(
    (id: string, data: Partial<ProjectData>) => {
      if (projectSaveTimers.current[id]) {
        clearTimeout(projectSaveTimers.current[id])
      }
      projectSaveTimers.current[id] = setTimeout(() => {
        startTransition(async () => {
          await updateProject(id, data)
        })
        delete projectSaveTimers.current[id]
      }, 500)
    },
    [startTransition],
  )

  function handleUpdateProject(id: string, data: Partial<ProjectData>) {
    // Update local state immediately for responsiveness
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    )
    // Debounce the server action
    debouncedUpdateProject(id, data)
  }

  function handleDeleteProject(id: string) {
    startTransition(async () => {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleAddTeam(projectId: string) {
    startTransition(async () => {
      const team = await createTeam({
        name: 'New Team',
        colour: '#c2410c',
        projectId,
      })
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, teams: [...p.teams, { ...team }] }
            : p,
        ),
      )
    })
  }

  const teamSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleUpdateTeam(teamId: string, projectId: string, data: Partial<TeamData>) {
    // Update local state immediately
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              teams: p.teams.map((t) =>
                t.id === teamId ? { ...t, ...data } : t,
              ),
            }
          : p,
      ),
    )
    // Debounce server action
    if (teamSaveTimers.current[teamId]) {
      clearTimeout(teamSaveTimers.current[teamId])
    }
    teamSaveTimers.current[teamId] = setTimeout(() => {
      startTransition(async () => {
        await updateTeam(teamId, data)
      })
      delete teamSaveTimers.current[teamId]
    }, 500)
  }

  function handleDeleteTeam(teamId: string, projectId: string) {
    startTransition(async () => {
      await deleteTeam(teamId)
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, teams: p.teams.filter((t) => t.id !== teamId) }
            : p,
        ),
      )
    })
  }

  return (
    <div className="space-y-10">
      {/* User identity */}
      <section>
        <SectionLabel>User identity</SectionLabel>
        <div className="flex items-center gap-3 mt-3 mb-4">
          <Avatar variant="human" initial={user.displayName} avatarUrl={user.avatarUrl} size="chat" />
          <div>
            <div className="text-[14px] font-medium">{user.displayName}</div>
            <div className="text-[12px] text-[var(--text-muted)]">@{user.githubUsername}</div>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[12px] text-[var(--text-muted)] mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)]"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleUpdateName}
            disabled={!displayName.trim() || displayName === user.displayName || isPending}
          >
            Save
          </Button>
        </div>
      </section>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Projects</SectionLabel>
          <Button variant="secondary" size="sm" onClick={() => setShowRepoPicker(true)} disabled={isPending}>
            <Plus size={12} /> Add project
          </Button>
        </div>

        {projects.length === 0 && (
          <p className="text-[13px] text-[var(--text-muted)]">
            No projects yet. Add one to get started.
          </p>
        )}

        <div className="space-y-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 bg-[var(--bg-surface)]"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 space-y-3">
                  <FieldRow label="Name">
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) =>
                        handleUpdateProject(project.id, { name: e.target.value })
                      }
                      className="flex-1 px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                    />
                  </FieldRow>
                  <FieldRow label="Repository">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {project.owner}/{project.repoName}
                    </span>
                  </FieldRow>
                  <FieldRow label="Default branch">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {project.defaultBranch}
                    </span>
                  </FieldRow>
                </div>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 p-1 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Teams */}
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    Teams
                  </span>
                  <button
                    onClick={() => handleAddTeam(project.id)}
                    className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                  >
                    + Add team
                  </button>
                </div>
                {project.teams.length === 0 && (
                  <p className="text-[12px] text-[var(--text-muted)]">No teams yet.</p>
                )}
                <div className="space-y-2">
                  {project.teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={team.colour}
                        onChange={(e) =>
                          handleUpdateTeam(team.id, project.id, { colour: e.target.value })
                        }
                        className="w-6 h-6 rounded-full border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) =>
                          handleUpdateTeam(team.id, project.id, { name: e.target.value })
                        }
                        className="flex-1 px-3 py-[5px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                      />
                      <button
                        onClick={() => handleDeleteTeam(team.id, project.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 p-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {showRepoPicker && (
          <RepoPickerDialog
            existingRepoUrls={existingRepoUrls}
            onSelect={handleAddProjectFromRepo}
            onClose={() => setShowRepoPicker(false)}
          />
        )}
      </section>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
      {children}
    </h3>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-[var(--text-muted)] w-[100px] shrink-0">
        {label}
      </span>
      {children}
    </div>
  )
}
