'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getFinancialYearRange } from '@/lib/utils'

export type DateRange = {
  from: string
  to: string
  label: string
  id: string
}

type FilterContextType = {
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  availableFYs: DateRange[]
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  // Initialize with the current Financial Year
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Try to load from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finsight_daterange')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          // Fallback if parsing fails
        }
      }
    }
    
    const currentFY = getFinancialYearRange()
    return {
      from: currentFY.start,
      to: currentFY.end,
      label: currentFY.label,
      id: 'current_fy'
    }
  })

  // Persist to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('finsight_daterange', JSON.stringify(dateRange))
    }
  }, [dateRange])

  // Generate the last 3 Financial Years for the dropdown
  const generateAvailableFYs = () => {
    const list: DateRange[] = []
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    
    // Determine the starting year of the current FY
    let startYear = currentMonth >= 3 ? currentYear : currentYear - 1
    
    // We'll provide the current FY and the 2 previous ones
    for (let i = 0; i < 3; i++) {
      const fyStart = new Date(startYear - i, 3, 1) // April 1st
      const fyEnd = new Date(startYear - i + 1, 2, 31) // March 31st
      list.push({
        from: fyStart.toISOString().split('T')[0],
        to: fyEnd.toISOString().split('T')[0],
        label: `FY ${startYear - i}-${(startYear - i + 1).toString().slice(2)}`,
        id: `fy_${startYear - i}`
      })
    }
    return list
  }

  const availableFYs = generateAvailableFYs()

  return (
    <FilterContext.Provider value={{ dateRange, setDateRange, availableFYs }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilterContext() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider')
  }
  return context
}
