export function PriorityIcon({ priority }: { priority: string }) {
  const colour =
    priority === 'URGENT' || priority === 'HIGH'
      ? 'var(--accent)'
      : 'currentColor'
  const opMid = priority === 'LOW' ? 0.3 : 0.6
  const opBot = priority === 'LOW' || priority === 'MEDIUM' ? 0.3 : 1
  return (
    <svg
      width="11"
      height="9"
      viewBox="0 0 12 8"
      fill="none"
      className="shrink-0"
    >
      <rect x="0" y="0" width="12" height="1.5" rx="0.75" fill={colour} />
      <rect
        x="0"
        y="3.25"
        width="8"
        height="1.5"
        rx="0.75"
        fill={colour}
        opacity={opMid}
      />
      <rect
        x="0"
        y="6.5"
        width="5"
        height="1.5"
        rx="0.75"
        fill={colour}
        opacity={opBot}
      />
    </svg>
  )
}

export function AssigneeIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MiniAvatar({ initial }: { initial: string }) {
  return (
    <span
      className="w-[14px] h-[14px] rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0"
      style={{ fontSize: '7px', fontWeight: 600 }}
    >
      {initial}
    </span>
  )
}

export function TeamIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
