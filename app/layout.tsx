import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '360° Rating System',
  description: 'Employee 360-degree feedback and rating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
