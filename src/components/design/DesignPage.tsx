'use client'

import { ProjectPageShell } from '../ProjectPageShell'
import { DesignBrowser } from './DesignBrowser'

interface Props {
  projectSlug: string
}

export function DesignPage({ projectSlug }: Props) {
  return (
    <ProjectPageShell projectSlug={projectSlug} title="Design">
      {(project) => (
        <DesignBrowser
          owner={project.owner}
          repoName={project.repoName}
          defaultBranch={project.defaultBranch}
        />
      )}
    </ProjectPageShell>
  )
}
