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

  const [savePrompt, setSavePrompt] = useState<{
    fromPath: string
    toPath: string
  } | null>(null)

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
    const ok = await onStartEditing(filePath)
    if (!ok) return
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

  // Exit focus -> back to artifact
  const exitFocus = useCallback(() => {
    const filePath = view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath },
    })
  }, [view])

  // Save prompt: save and flip
  const saveAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onDoneEditing(savePrompt.fromPath)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, onDoneEditing])

  // Save prompt: discard and flip (restores content, releases lock)
  const discardAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await onRestoreContent(savePrompt.fromPath)
    await onReleaseLock(savePrompt.fromPath)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, onReleaseLock, onRestoreContent])

  return {
    view,
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
