import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JewelCAD — Jewelry Material Analyzer',
  description: 'Upload a jewelry photo. Get exact material weights, stone specifications, and CAD files instantly.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark-950 text-dark-50 antialiased">{children}</body>
    </html>
  )
}
