'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { useUser } from './UserProvider'
import { updateUser } from '../lib/actions/user'
import { createProduct, updateProduct, deleteProduct } from '../lib/actions/products'
import { createTeam, updateTeam, deleteTeam, joinTeam, leaveTeam } from '../lib/actions/teams'
import { Trash2, Plus, UserPlus, UserMinus } from 'lucide-react'

interface TeamData {
  id: string
  name: string
  colour: string
  isMember: boolean
}

interface ProductData {
  id: string
  name: string
  githubUrl: string
  owner: string
  repoName: string
  defaultBranch: string
  teams: TeamData[]
}

interface SettingsFormProps {
  products: ProductData[]
}

export function SettingsForm({ products: initialProducts }: SettingsFormProps) {
  const { user, setUser } = useUser()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [products, setProducts] = useState(initialProducts)
  const [isPending, startTransition] = useTransition()
  const productSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleUpdateName() {
    if (!displayName.trim() || displayName === user.displayName) return
    startTransition(async () => {
      const updated = await updateUser(user.id, displayName.trim())
      setUser({ ...user, displayName: updated.displayName })
    })
  }

  function handleAddProduct() {
    startTransition(async () => {
      const product = await createProduct({
        name: 'New Product',
        githubUrl: 'https://github.com/org/repo',
        owner: 'org',
        repoName: 'repo',
      })
      setProducts((prev) => [
        ...prev,
        { ...product, teams: [] },
      ])
    })
  }

  const debouncedUpdateProduct = useCallback(
    (id: string, data: Partial<ProductData>) => {
      if (productSaveTimers.current[id]) {
        clearTimeout(productSaveTimers.current[id])
      }
      productSaveTimers.current[id] = setTimeout(() => {
        startTransition(async () => {
          await updateProduct(id, data)
        })
        delete productSaveTimers.current[id]
      }, 500)
    },
    [startTransition],
  )

  function handleUpdateProduct(id: string, data: Partial<ProductData>) {
    // Update local state immediately for responsiveness
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    )
    // Debounce the server action
    debouncedUpdateProduct(id, data)
  }

  function handleDeleteProduct(id: string) {
    startTransition(async () => {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleAddTeam(productId: string) {
    startTransition(async () => {
      const team = await createTeam({
        name: 'New Team',
        colour: '#c2410c',
        productId,
      })
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, teams: [...p.teams, { ...team, isMember: false }] }
            : p,
        ),
      )
    })
  }

  const teamSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleUpdateTeam(teamId: string, productId: string, data: Partial<TeamData>) {
    // Update local state immediately
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
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

  function handleDeleteTeam(teamId: string, productId: string) {
    startTransition(async () => {
      await deleteTeam(teamId)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, teams: p.teams.filter((t) => t.id !== teamId) }
            : p,
        ),
      )
    })
  }

  function handleJoinTeam(teamId: string, productId: string) {
    startTransition(async () => {
      await joinTeam(user.id, teamId)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                teams: p.teams.map((t) =>
                  t.id === teamId ? { ...t, isMember: true } : t,
                ),
              }
            : p,
        ),
      )
    })
  }

  function handleLeaveTeam(teamId: string, productId: string) {
    startTransition(async () => {
      await leaveTeam(user.id, teamId)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                teams: p.teams.map((t) =>
                  t.id === teamId ? { ...t, isMember: false } : t,
                ),
              }
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
            <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
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

      {/* Products */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Products</SectionLabel>
          <Button variant="secondary" size="sm" onClick={handleAddProduct} disabled={isPending}>
            <Plus size={12} /> Add product
          </Button>
        </div>

        {products.length === 0 && (
          <p className="text-[13px] text-[var(--text-muted)]">
            No products yet. Add one to get started.
          </p>
        )}

        <div className="space-y-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 bg-[var(--bg-surface)]"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 space-y-3">
                  <FieldRow label="Name">
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) =>
                        handleUpdateProduct(product.id, { name: e.target.value })
                      }
                      className="flex-1 px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                    />
                  </FieldRow>
                  <FieldRow label="GitHub URL">
                    <input
                      type="text"
                      value={product.githubUrl}
                      onChange={(e) => {
                        const url = e.target.value
                        const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
                        handleUpdateProduct(product.id, {
                          githubUrl: url,
                          owner: match?.[1] ?? product.owner,
                          repoName: match?.[2] ?? product.repoName,
                        })
                      }}
                      className="flex-1 px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                    />
                  </FieldRow>
                  <FieldRow label="Default branch">
                    <input
                      type="text"
                      value={product.defaultBranch}
                      onChange={(e) =>
                        handleUpdateProduct(product.id, {
                          defaultBranch: e.target.value,
                        })
                      }
                      className="w-[120px] px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                    />
                  </FieldRow>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
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
                    onClick={() => handleAddTeam(product.id)}
                    className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                  >
                    + Add team
                  </button>
                </div>
                {product.teams.length === 0 && (
                  <p className="text-[12px] text-[var(--text-muted)]">No teams yet.</p>
                )}
                <div className="space-y-2">
                  {product.teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={team.colour}
                        onChange={(e) =>
                          handleUpdateTeam(team.id, product.id, { colour: e.target.value })
                        }
                        className="w-6 h-6 rounded-full border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) =>
                          handleUpdateTeam(team.id, product.id, { name: e.target.value })
                        }
                        className="flex-1 px-3 py-[5px] text-[13px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                      />
                      {team.isMember ? (
                        <button
                          onClick={() => handleLeaveTeam(team.id, product.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors duration-100 px-2 py-1"
                          title="Leave team"
                        >
                          <UserMinus size={12} /> Leave
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(team.id, product.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100 px-2 py-1"
                          title="Join team"
                        >
                          <UserPlus size={12} /> Join
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeam(team.id, product.id)}
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
