import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getMonthRange(monthOffset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health & Medical',
  'Education',
  'Housing & Rent',
  'Utilities',
  'Subscriptions',
  'Travel',
  'Personal Care',
  'Investments',
  'Insurance',
  'Loans & EMI',
  'Gifts & Donations',
  'Other',
]

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Rental Income',
  'Dividends',
  'Side Income',
  'Other',
]

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  'Transport': '#6366f1',
  'Shopping': '#ec4899',
  'Entertainment': '#a855f7',
  'Health & Medical': '#22c55e',
  'Education': '#3b82f6',
  'Housing & Rent': '#f59e0b',
  'Utilities': '#14b8a6',
  'Subscriptions': '#8b5cf6',
  'Travel': '#06b6d4',
  'Personal Care': '#f43f5e',
  'Investments': '#10b981',
  'Insurance': '#64748b',
  'Loans & EMI': '#ef4444',
  'Gifts & Donations': '#84cc16',
  'Salary': '#10b981',
  'Freelance': '#3b82f6',
  'Business': '#f59e0b',
  'Dividends': '#6366f1',
  'Other': '#94a3b8',
}
