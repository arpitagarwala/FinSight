import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinSight AI — Smart Personal Finance',
  description: 'AI-powered personal finance platform. Track expenses, manage budgets, generate invoices, and get smart financial insights. Free forever.',
  keywords: 'personal finance, budget tracker, expense tracker, invoice generator, financial calculator, AI finance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
