'use client'

import { ProjectPageShell } from '../ProjectPageShell'
import { SpecExplorer } from './SpecExplorer'

interface Props {
  projectSlug: string
}

export function SpecsPage({ projectSlug }: Props) {
  return (
    <ProjectPageShell projectSlug={projectSlug} title="Specs">
      {(project) => (
        <SpecExplorer
          owner={project.owner}
          repoName={project.repoName}
          defaultBranch={project.defaultBranch}
          projectName={project.name}
          teams={project.teams.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
    </ProjectPageShell>
  )
}
