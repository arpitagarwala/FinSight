'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayPicker, DateRange as RDPDateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { useFilterContext, DateRange } from '@/lib/context/FilterContext'

export default function DateRangeSelector() {
  const { dateRange, setDateRange, availableFYs } = useFilterContext()
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [tempRange, setTempRange] = useState<RDPDateRange | undefined>()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPreset = (preset: DateRange) => {
    setDateRange(preset)
    setIsOpen(false)
    setShowCustom(false)
  }

  const handleCustomApply = () => {
    if (tempRange && tempRange.from && tempRange.to) {
      setDateRange({
        from: format(tempRange.from, 'yyyy-MM-dd'),
        to: format(tempRange.to, 'yyyy-MM-dd'),
        label: `${format(tempRange.from, 'MMM d, yyyy')} - ${format(tempRange.to, 'MMM d, yyyy')}`,
        id: 'custom'
      })
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  // Generate dynamic presets
  const today = new Date()
  const presets: DateRange[] = [
    {
      label: 'Current Month',
      id: 'current_month',
      from: format(startOfMonth(today), 'yyyy-MM-dd'),
      to: format(endOfMonth(today), 'yyyy-MM-dd')
    },
    {
      label: 'Last Month',
      id: 'last_month',
      from: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
    },
    ...availableFYs
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#13131f] hover:bg-[#1a1a2e] border border-[#1e1e2e] rounded-xl transition-all text-sm font-medium text-slate-300 hover:text-white"
      >
        <CalendarIcon size={16} className="text-indigo-400" />
        <span className="truncate max-w-[120px] sm:max-w-none">{dateRange.label}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 top-full mt-2 bg-[#0f0f1a] border border-[#1e1e2e] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col ${showCustom ? 'w-[320px] sm:w-[600px] p-4' : 'w-[240px] py-2'}`}
          >
            {!showCustom ? (
              // Presets List
              <div className="flex flex-col">
                <div className="px-3 pb-2 mb-2 border-b border-[#1e1e2e]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Date Range</p>
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  >
                    <span className={dateRange.id === preset.id ? 'text-indigo-400 font-medium' : 'text-slate-300'}>
                      {preset.label}
                    </span>
                    {dateRange.id === preset.id && <Check size={16} className="text-indigo-400" />}
                  </button>
                ))}
                
                <div className="h-px bg-[#1e1e2e] my-1" />
                
                <button
                  onClick={() => setShowCustom(true)}
                  className="flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors group"
                >
                  <span className={dateRange.id === 'custom' ? 'text-indigo-400 font-medium' : 'text-slate-300'}>
                    Custom Range...
                  </span>
                  <ChevronDown size={16} className="text-slate-500 group-hover:text-white -rotate-90 transition-transform" />
                </button>
              </div>
            ) : (
              // Custom Range Calendar Picker
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e1e2e]">
                  <button onClick={() => setShowCustom(false)} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
                    <ChevronDown size={16} className="rotate-90" /> Back
                  </button>
                  <h3 className="text-sm font-semibold text-white">Custom Range</h3>
                  <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                </div>

                <div className="flex justify-center overflow-x-auto custom-calendar-wrapper pb-2">
                  <style dangerouslySetInnerHTML={{__html: `
                    .rdp {
                      --rdp-cell-size: 36px;
                      --rdp-accent-color: #6366f1;
                      --rdp-background-color: rgba(99, 102, 241, 0.1);
                      --rdp-outline: 2px solid var(--rdp-accent-color);
                      --rdp-outline-offset: 2px;
                      margin: 0;
                    }
                    .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                      background-color: var(--rdp-accent-color);
                      color: white;
                    }
                    .rdp-day_range_middle {
                      background-color: var(--rdp-background-color);
                      color: #e2e8f0;
                    }
                    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                      background-color: rgba(255,255,255,0.05);
                    }
                    .rdp-caption_label {
                      font-size: 14px;
                      font-weight: 600;
                      color: #f1f5f9;
                    }
                    .rdp-head_cell {
                      color: #64748b;
                      font-weight: 500;
                      font-size: 13px;
                    }
                    .rdp-day {
                      color: #cbd5e1;
                      border-radius: 8px;
                    }
                    .rdp-day_outside {
                      color: #475569;
                    }
                    .rdp-nav_button {
                      background-color: rgba(255,255,255,0.05);
                      border-radius: 8px;
                      color: #94a3b8;
                    }
                    .rdp-nav_button:hover {
                      background-color: rgba(255,255,255,0.1);
                      color: white;
                    }
                  `}} />
                  <DayPicker
                    mode="range"
                    selected={tempRange}
                    onSelect={setTempRange}
                    numberOfMonths={typeof window !== 'undefined' && window.innerWidth >= 640 ? 2 : 1}
                    className="rdp"
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-[#1e1e2e] flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {tempRange?.from ? (
                      tempRange.to ? (
                        `${format(tempRange.from, 'MMM d, yyyy')} - ${format(tempRange.to, 'MMM d, yyyy')}`
                      ) : (
                        `${format(tempRange.from, 'MMM d, yyyy')} - ...`
                      )
                    ) : 'Select dates'}
                  </div>
                  <button 
                    onClick={handleCustomApply}
                    disabled={!tempRange?.from || !tempRange?.to}
                    className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
