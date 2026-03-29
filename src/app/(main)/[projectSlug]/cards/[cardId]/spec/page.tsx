import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { SpecTab } from '../../../../../../components/card/SpecTab'
import { getChangedFiles, readWorktreeFile, worktreeExists } from '../../../../../../lib/git/worktree'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function SpecPage({ params }: Props) {
  const { cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) notFound()

  const { owner, repoName, defaultBranch } = card.team.project

  // Load spec files from worktree if it exists
  let initialFiles: { filePath: string; isNew: boolean; content: string }[] = []

  const hasWorktree = await worktreeExists(owner, repoName, card.identifier)
  if (hasWorktree) {
    const changedFiles = await getChangedFiles(
      owner, repoName, card.identifier, defaultBranch,
    )

    // Filter to spec files only
    const specFiles = changedFiles.filter((f) =>
      f.filePath.startsWith('.workhorse/specs/') ||
      f.filePath.startsWith('.workhorse/design/mockups/'),
    )

    // Read content for each file
    initialFiles = await Promise.all(
      specFiles.map(async (f) => {
        const content = await readWorktreeFile(
          owner, repoName, card.identifier, f.filePath,
        ) ?? ''
        return { ...f, content }
      }),
    )
  }

  return (
    <SpecTab
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
      }}
      initialFiles={initialFiles}
    />
  )
}
