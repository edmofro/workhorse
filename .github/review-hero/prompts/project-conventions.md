# Agent: Project Conventions

Check for project-specific conventions and domain rules.

Read `CLAUDE.md` for the full project conventions. Key rules:

- **Spelling:** Australian/NZ English (colour, organisation, finalise)
- **Design system:** Follow `.workhorse/design/design-system.md` strictly — Inter font, 4px spacing grid, subtle hover states
- **Component files:** PascalCase (`FeatureList.tsx`)
- **Utility files:** camelCase (`prismaClient.ts`)
- **Feature IDs:** WH-XXX format
- **Framework:** Next.js App Router with TypeScript, Tailwind CSS v4, Prisma ORM
- **Icons:** Lucide React only
- **Utilities:** clsx + tailwind-merge for class merging

Ignore: high-level architecture, performance, generic security, generic bugs.
