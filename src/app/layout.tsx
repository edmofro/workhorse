import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workhorse',
  description: 'Spec-driven development workbench',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
