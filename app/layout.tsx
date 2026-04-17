import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LegalMind — AI Legal Workspace',
  description: 'The smartest workspace for the solo attorney.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
