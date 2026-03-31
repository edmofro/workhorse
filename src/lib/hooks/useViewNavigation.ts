'use client'

import { useCallback, useReducer, useState } from 'react'

// --- View state types ---

export type ViewState =
  | { type: 'card' }
  | { type: 'chat'; sessionId: string | null; sessionTitle: string | null }
  | { type: 'artifact'; filePath: string; editing: boolean }

type ViewAction =
  | { type: 'navigate'; to: ViewState }
  | { type: 'back' }
  | { type: 'close_artifact' }

interface ViewNavState {
  current: ViewState
  history: ViewState[]
}

function viewReducer(state: ViewNavState, action: ViewAction): ViewNavState {
  switch (action.type) {
    case 'navigate':
      return {
        current: action.to,
        history: [...state.history, state.current],
      }
    case 'back': {
      if (state.history.length === 0) {
        return { current: { type: 'card' }, history: [] }
      }
      return {
        current: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      }
    }
    case 'close_artifact': {
      // Close artifact -> return to the view we came from.
      // If there's a chat in history, return to chat. Otherwise return to card home.
      // Clear artifact entries from history so back goes cleanly.
      const lastChat = [...state.history].reverse().find((v) => v.type === 'chat')
      if (lastChat?.type === 'chat') {
        return {
          current: { type: 'chat', sessionId: lastChat.sessionId, sessionTitle: lastChat.sessionTitle },
          history: state.history.filter((v) => v.type !== 'artifact'),
        }
      }
      // No chat in history — we came from card home
      return {
        current: { type: 'card' },
        history: [],
      }
    }
  }
}

export interface SavePrompt {
  /** File being edited */
  fromPath: string
  /** Where to go after save/discard */
  toPath: string
}

interface UseViewNavigationOptions {
  allNavigableFiles: string[]
  initialView?: ViewState
  onStartEditing: () => Promise<boolean>
  onDoneEditing: (filePath: string) => Promise<void>
  onRestoreContent: (filePath: string) => Promise<void>
}

export function useViewNavigation({
  allNavigableFiles,
  initialView,
  onStartEditing,
  onDoneEditing,
  onRestoreContent,
}: UseViewNavigationOptions) {
  const [viewNav, dispatchView] = useReducer(viewReducer, {
    current: initialView ?? ({ type: 'card' } as ViewState),
    history: initialView ? [{ type: 'card' } as ViewState] : [],
  })
  const view = viewNav.current

  const [savePrompt, setSavePrompt] = useState<SavePrompt | null>(null)

  /** Whether the view is currently in an editing state */
  const isEditing = view.type === 'artifact' && view.editing

  const navigateTo = useCallback((next: ViewState) => {
    dispatchView({ type: 'navigate', to: next })
  }, [])

  const goBack = useCallback(() => {
    dispatchView({ type: 'back' })
  }, [])

  const closeArtifact = useCallback(() => {
    dispatchView({ type: 'close_artifact' })
  }, [])

  // Open a file as an artifact (specs and mockups use the same view)
  const openFile = useCallback(
    (filePath: string) => {
      navigateTo({ type: 'artifact', filePath, editing: false })
    },
    [navigateTo],
  )

  // Navigate to a different file while in artifact mode (with save prompt if editing)
  const navigateToFile = useCallback(
    (filePath: string) => {
      if (view.type === 'artifact' && view.editing && view.filePath !== filePath) {
        setSavePrompt({ fromPath: view.filePath, toPath: filePath })
        return
      }
      dispatchView({
        type: 'navigate',
        to: { type: 'artifact', filePath, editing: false },
      })
    },
    [view],
  )

  // Prev/Next file navigation
  const navigatePrev = useCallback(() => {
    const currentPath = view.type === 'artifact' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx > 0) {
      navigateToFile(allNavigableFiles[idx - 1])
    }
  }, [view, allNavigableFiles, navigateToFile])

  const navigateNext = useCallback(() => {
    const currentPath = view.type === 'artifact' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx < allNavigableFiles.length - 1) {
      navigateToFile(allNavigableFiles[idx + 1])
    }
  }, [view, allNavigableFiles, navigateToFile])

  // Enter editing mode in-place (no layout change)
  const enterEdit = useCallback(async () => {
    if (view.type !== 'artifact') return
    try {
      const ok = await onStartEditing()
      if (!ok) return
    } catch {
      return
    }
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath: view.filePath, editing: true },
    })
  }, [view, onStartEditing])

  // Done editing -> back to read-only artifact
  const finishEditing = useCallback(async () => {
    if (view.type !== 'artifact' || !view.editing) return
    await onDoneEditing(view.filePath)
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath: view.filePath, editing: false },
    })
  }, [view, onDoneEditing])

  // Save prompt: save and continue to the target file
  const saveAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onDoneEditing(savePrompt.fromPath)
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, onDoneEditing])

  // Save prompt: discard and continue (restores content)
  const discardAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onRestoreContent(savePrompt.fromPath)
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, onRestoreContent])

  return {
    view,
    isEditing,
    navigateTo,
    goBack,
    closeArtifact,
    openFile,
    navigateToFile,
    navigatePrev,
    navigateNext,
    enterEdit,
    finishEditing,
    savePrompt,
    saveAndFlip,
    discardAndFlip,
  }
}
