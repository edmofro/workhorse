'use client'

import { useCallback, useReducer, useState } from 'react'

// --- View state types ---

export type ViewState =
  | { type: 'card' }
  | { type: 'chat' }
  | { type: 'artifact'; filePath: string }
  | { type: 'focus'; filePath: string; editing: boolean }
  | { type: 'mockup'; filePath: string }

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
    case 'close_artifact':
      // Close artifact -> return to centred chat. Clear history past chat
      // so back goes to card home, not a stale artifact entry.
      return {
        current: { type: 'chat' },
        history: state.history.filter((v) => v.type !== 'artifact' && v.type !== 'focus'),
      }
  }
}

export interface SavePrompt {
  /** File being edited */
  fromPath: string
  /** Where to go after save/discard. null = exit to artifact mode */
  toPath: string | null
}

interface UseViewNavigationOptions {
  allNavigableFiles: string[]
  onStartEditing: (filePath: string) => Promise<boolean>
  onDoneEditing: (filePath: string) => Promise<void>
  onReleaseLock: (filePath: string) => Promise<void>
  onRestoreContent: (filePath: string) => Promise<void>
}

export function useViewNavigation({
  allNavigableFiles,
  onStartEditing,
  onDoneEditing,
  onReleaseLock,
  onRestoreContent,
}: UseViewNavigationOptions) {
  const [viewNav, dispatchView] = useReducer(viewReducer, {
    current: { type: 'card' } as ViewState,
    history: [],
  })
  const view = viewNav.current

  const [savePrompt, setSavePrompt] = useState<SavePrompt | null>(null)

  /** Whether the view is currently in an editing state */
  const isEditing = view.type === 'focus' && view.editing

  const navigateTo = useCallback((next: ViewState) => {
    dispatchView({ type: 'navigate', to: next })
  }, [])

  const goBack = useCallback(() => {
    dispatchView({ type: 'back' })
  }, [])

  const closeArtifact = useCallback(() => {
    dispatchView({ type: 'close_artifact' })
  }, [])

  // Open a spec as an artifact (always navigates to artifact mode)
  const openSpec = useCallback(
    (filePath: string) => {
      navigateTo({ type: 'artifact', filePath })
    },
    [navigateTo],
  )

  // Open a file — routes to mockup or artifact depending on path
  const openFile = useCallback(
    (filePath: string) => {
      if (filePath.startsWith('.workhorse/design/mockups/')) {
        navigateTo({ type: 'mockup', filePath })
      } else {
        navigateTo({ type: 'artifact', filePath })
      }
    },
    [navigateTo],
  )

  // Focus mode: navigate to different file (with save prompt if editing)
  const focusNavigate = useCallback(
    (filePath: string) => {
      if (view.type === 'focus' && view.editing && view.filePath !== filePath) {
        setSavePrompt({ fromPath: view.filePath, toPath: filePath })
        return
      }
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath, editing: false },
      })
    },
    [view],
  )

  // Prev/Next spec navigation
  const navigatePrev = useCallback(() => {
    const currentPath = view.type === 'artifact' || view.type === 'focus' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx > 0) {
      const newPath = allNavigableFiles[idx - 1]
      if (view.type === 'focus') {
        focusNavigate(newPath)
      } else {
        dispatchView({ type: 'navigate', to: { type: 'artifact', filePath: newPath } })
      }
    }
  }, [view, allNavigableFiles, focusNavigate])

  const navigateNext = useCallback(() => {
    const currentPath = view.type === 'artifact' || view.type === 'focus' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx < allNavigableFiles.length - 1) {
      const newPath = allNavigableFiles[idx + 1]
      if (view.type === 'focus') {
        focusNavigate(newPath)
      } else {
        dispatchView({ type: 'navigate', to: { type: 'artifact', filePath: newPath } })
      }
    }
  }, [view, allNavigableFiles, focusNavigate])

  // Enter focus mode (from artifact)
  const enterFocus = useCallback(() => {
    const filePath = view.type === 'artifact' ? view.filePath : null
    if (!filePath) return
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath, editing: false },
    })
  }, [view])

  // Enter focus + editing (from artifact or focus)
  const enterEdit = useCallback(async () => {
    const filePath =
      view.type === 'artifact' ? view.filePath :
      view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    try {
      const ok = await onStartEditing(filePath)
      if (!ok) return
    } catch {
      return
    }
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath, editing: true },
    })
  }, [view, onStartEditing])

  // Done editing -> back to focus read-only
  const finishEditing = useCallback(async () => {
    const filePath = view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    await onDoneEditing(filePath)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath, editing: false },
    })
  }, [view, onDoneEditing])

  // Exit focus -> back to artifact. Prompts save if editing.
  const exitFocus = useCallback(() => {
    if (view.type !== 'focus') return
    if (view.editing) {
      // Prompt save — toPath null means "exit to artifact mode"
      setSavePrompt({ fromPath: view.filePath, toPath: null })
      return
    }
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath: view.filePath },
    })
  }, [view])

  // Save prompt: save and continue
  const saveAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onDoneEditing(savePrompt.fromPath)
    if (savePrompt.toPath) {
      // Flipping to another file in focus mode
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
      })
    } else {
      // Exiting focus mode to artifact
      dispatchView({
        type: 'navigate',
        to: { type: 'artifact', filePath: savePrompt.fromPath },
      })
    }
    setSavePrompt(null)
  }, [savePrompt, onDoneEditing])

  // Save prompt: discard and continue (restores content, releases lock)
  const discardAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onRestoreContent(savePrompt.fromPath)
    await onReleaseLock(savePrompt.fromPath)
    if (savePrompt.toPath) {
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
      })
    } else {
      dispatchView({
        type: 'navigate',
        to: { type: 'artifact', filePath: savePrompt.fromPath },
      })
    }
    setSavePrompt(null)
  }, [savePrompt, onReleaseLock, onRestoreContent])

  return {
    view,
    isEditing,
    navigateTo,
    goBack,
    closeArtifact,
    openSpec,
    openFile,
    focusNavigate,
    navigatePrev,
    navigateNext,
    enterFocus,
    enterEdit,
    finishEditing,
    exitFocus,
    savePrompt,
    saveAndFlip,
    discardAndFlip,
  }
}
