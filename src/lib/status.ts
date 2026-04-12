import type { StatusIconState } from '../components/StatusIcon'

export const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'SPECIFYING', label: 'Specifying' },
  { value: 'IMPLEMENTING', label: 'Implementing' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export function dbStatusToIconState(status: string | null): StatusIconState {
  switch (status) {
    case 'SPECIFYING':
    case 'IN_PROGRESS':
    case 'SPEC_COMPLETE':
      return 'specifying'
    case 'IMPLEMENTING':
      return 'implementing'
    case 'COMPLETE':
      return 'complete'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'not-started'
  }
}
