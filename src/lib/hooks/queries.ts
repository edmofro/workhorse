'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError()
    throw new Error(`Fetch failed: ${res.status}`)
  }
  return res.json()
}

export class NotFoundError extends Error {
  constructor() {
    super('Not found')
    this.name = 'NotFoundError'
  }
}

// ── Sidebar data (projects + recent sessions) ──────────────────────────

interface SidebarProject {
  id: string
  name: string
  teams: { id: string; name: string; colour: string }[]
}

interface SidebarSession {
  id: string
  title: string | null
  messageCount: number
  lastMessageAt: string
  createdAt: string
  cardId: string | null
  cardIdentifier: string | null
  cardTitle: string | null
  teamColour: string | null
  projectName: string | null
}

interface SidebarData {
  projects: SidebarProject[]
  recentSessions: SidebarSession[]
}

export function useSidebarData(initialData?: SidebarData) {
  return useQuery({
    queryKey: ['sidebar-data'],
    queryFn: () => fetchJSON<SidebarData>('/api/sidebar-data'),
    staleTime: 60_000, // Sidebar data is fairly stable, revalidate every minute
    initialData,
  })
}

// ── Project board (cards, teams, users) ─────────────────────────────────

interface BoardCard {
  id: string
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  tags: string
  assignee: { id: string; displayName: string } | null
  team: { id: string; name: string; colour: string }
}

interface BoardData {
  project: {
    id: string
    name: string
    teams: { id: string; name: string; colour: string }[]
  }
  cards: BoardCard[]
  users: { id: string; displayName: string }[]
}

export function useProjectBoard(projectSlug: string) {
  return useQuery({
    queryKey: ['project-board', projectSlug],
    queryFn: () =>
      fetchJSON<BoardData>(
        `/api/project-board?project=${encodeURIComponent(projectSlug)}`,
      ),
    staleTime: 10_000, // Cards change frequently, keep fresh
  })
}

// ── Card detail (full card data for workspace) ──────────────────────────

interface CardAttachment {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
}

interface CardComment {
  id: string
  content: string
  createdAt: string
  user: { id: string; displayName: string; avatarUrl: string | null }
  attachments: CardAttachment[]
}

interface CardActivity {
  id: string
  action: string
  details: string | null
  createdAt: string
  user: { displayName: string; avatarUrl: string | null } | null
}

interface CardMockup {
  id: string
  title: string
  html: string
  filePath: string
}

interface CardDetailData {
  card: {
    id: string
    identifier: string
    title: string
    description: string | null
    status: string
    priority: string
    tags: string
    cardBranch: string | null
    touchedFiles: string[]
    team: { id: string; name: string; colour: string }
    project: { id: string; name: string; defaultBranch: string }
    assignee: { id: string; displayName: string } | null
    dependsOn: { identifier: string; title: string }[]
    attachments: CardAttachment[]
    activities: CardActivity[]
    comments: CardComment[]
    mockups: CardMockup[]
  }
  users: { id: string; displayName: string }[]
  teams: { id: string; name: string; colour: string }[]
  sessions: {
    id: string
    title: string | null
    messageCount: number
    lastMessageAt: string
    createdAt: string
  }[]
  initialFiles: { filePath: string; isNew: boolean; content: string }[]
  initialCodeFiles: { filePath: string; isNew: boolean }[]
  projectSpecs: { filePath: string; content: string }[]
}

export function useCardDetail(cardId: string) {
  return useQuery({
    queryKey: ['card-detail', cardId],
    queryFn: () =>
      fetchJSON<CardDetailData>(
        `/api/card-detail?cardId=${encodeURIComponent(cardId)}`,
      ),
    staleTime: 15_000, // Card data changes during active work
  })
}

// ── Project lookup (lightweight, for specs/design pages) ────────────────

interface ProjectInfo {
  id: string
  name: string
  owner: string
  repoName: string
  defaultBranch: string
  teams: { id: string; name: string; colour: string }[]
}

export function useProjectLookup(projectSlug: string) {
  return useQuery({
    queryKey: ['project-lookup', projectSlug],
    queryFn: () =>
      fetchJSON<ProjectInfo>(
        `/api/project-lookup?slug=${encodeURIComponent(projectSlug)}`,
      ),
    staleTime: 5 * 60_000, // Project info rarely changes
  })
}

// ── Re-export types for consumers ───────────────────────────────────────

export type {
  SidebarData,
  SidebarProject,
  SidebarSession,
  BoardData,
  BoardCard,
  CardDetailData,
  CardAttachment,
  CardComment,
  CardActivity,
  CardMockup,
  ProjectInfo,
}
