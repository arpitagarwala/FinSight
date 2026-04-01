'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, Download, Check, Clock, AlertCircle, Trash2, Search, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'

type InvoiceTemplate = 'modern_dark' | 'classic_white' | 'minimal'
type InvoiceItem = { description: string; qty: number; rate: number }
type Invoice = {
  id: string; invoice_number: string; client_name: string; client_email: string;
  client_address?: string; client_gstin?: string;
  items: InvoiceItem[]; gst_rate: number; subtotal: number; gst_amount: number;
  total: number; status: string; issue_date: string; due_date: string; notes: string
}

// ============== PDF GENERATION ==============
function downloadPDF(
  inv: Invoice, template: InvoiceTemplate,
  biz: { company: string; address: string; gstin: string },
  includeGst: boolean
) {
  const doc = new jsPDF()
  const company = biz.company || 'My Business'
  const address = biz.address || ''
  const gstin = biz.gstin || ''
  const showGst = includeGst && gstin && inv.gst_rate > 0
  const displayTotal = showGst ? inv.total : inv.subtotal

  if (template === 'classic_white') {
    // ===== CLASSIC WHITE =====
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 4, 'F')

    doc.setTextColor('#1e293b'); doc.setFontSize(22); doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 20, 28)
    doc.setFontSize(10); doc.setTextColor('#64748b'); doc.setFont('helvetica', 'normal')
    doc.text(`# ${inv.invoice_number}`, 20, 36)
    doc.text(`Issue: ${formatDate(inv.issue_date)}`, 20, 43)
    if (inv.due_date) doc.text(`Due: ${formatDate(inv.due_date)}`, 20, 50)

    // From
    let fy = 22
    doc.setTextColor('#94a3b8'); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('FROM', 130, fy); fy += 6
    doc.setTextColor('#1e293b'); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(company, 130, fy); fy += 6
    if (address) { doc.setFontSize(9); doc.text(address, 130, fy, { maxWidth: 60 }); fy += 6 }
    if (gstin) { doc.setTextColor('#2563eb'); doc.setFontSize(8); doc.text(`GSTIN: ${gstin}`, 130, fy); fy += 6 }

    // Bill To
    fy += 4
    doc.setTextColor('#94a3b8'); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('BILL TO', 130, fy); fy += 6
    doc.setTextColor('#1e293b'); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(inv.client_name, 130, fy); fy += 6
    if (inv.client_email) { doc.setTextColor('#64748b'); doc.setFontSize(9); doc.text(inv.client_email, 130, fy); fy += 5 }
    if (inv.client_address) { doc.setFontSize(9); doc.text(inv.client_address, 130, fy, { maxWidth: 60 }); fy += 5 }
    if (inv.client_gstin) { doc.setTextColor('#2563eb'); doc.setFontSize(8); doc.text(`GSTIN: ${inv.client_gstin}`, 130, fy) }

    // Table
    let y = 68
    doc.setFillColor(241, 245, 249); doc.rect(20, y, 170, 10, 'F')
    doc.setTextColor('#475569'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Description', 25, y + 7)
    doc.text('Qty', 120, y + 7, { align: 'right' })
    doc.text('Rate', 150, y + 7, { align: 'right' })
    doc.text('Amount', 185, y + 7, { align: 'right' })
    y += 16
    doc.setFont('helvetica', 'normal'); doc.setTextColor('#334155'); doc.setFontSize(10)
    inv.items.forEach(item => {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.text(item.description, 25, y)
      doc.text(String(item.qty), 120, y, { align: 'right' })
      doc.text(formatCurrency(item.rate), 150, y, { align: 'right' })
      doc.text(formatCurrency(item.qty * item.rate), 185, y, { align: 'right' })
      doc.setDrawColor(226, 232, 240); doc.line(20, y + 4, 190, y + 4)
      y += 12
    })
    // Summary
    y += 8
    doc.setFontSize(10); doc.setTextColor('#64748b')
    doc.text('Subtotal:', 150, y, { align: 'right' }); doc.setTextColor('#1e293b'); doc.text(formatCurrency(inv.subtotal), 185, y, { align: 'right' })
    if (showGst) {
      y += 8; doc.setTextColor('#64748b')
      const isIgst = gstin && inv.client_gstin && gstin.substring(0, 2) !== inv.client_gstin.substring(0, 2)
      if (isIgst) {
        doc.text(`IGST (${inv.gst_rate}%):`, 150, y, { align: 'right' }); doc.setTextColor('#1e293b'); doc.text(formatCurrency(inv.gst_amount), 185, y, { align: 'right' })
      } else {
        doc.text(`CGST (${inv.gst_rate / 2}%):`, 150, y, { align: 'right' }); doc.setTextColor('#1e293b'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
        y += 7; doc.setTextColor('#64748b')
        doc.text(`SGST (${inv.gst_rate / 2}%):`, 150, y, { align: 'right' }); doc.setTextColor('#1e293b'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
      }
    }
    y += 10
    doc.setFillColor(37, 99, 235); doc.rect(135, y - 4, 55, 14, 'F')
    doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('TOTAL', 142, y + 5); doc.text(formatCurrency(displayTotal), 185, y + 5, { align: 'right' })
    if (inv.notes) {
      y += 22; doc.setTextColor('#475569'); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('NOTES:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(inv.notes, 20, y + 7, { maxWidth: 170 })
    }
    doc.setTextColor('#cbd5e1'); doc.setFontSize(8); doc.text('Generated by FinSight AI', 105, 290, { align: 'center' })

  } else if (template === 'minimal') {
    // ===== MINIMAL =====
    doc.setFillColor(252, 252, 252); doc.rect(0, 0, 210, 297, 'F')

    doc.setTextColor('#111827'); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(company.toUpperCase(), 20, 20)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#6b7280')
    if (address) doc.text(address, 20, 26)
    if (gstin) doc.text(`GSTIN: ${gstin}`, 20, address ? 32 : 26)

    doc.setTextColor('#111827'); doc.setFontSize(26); doc.setFont('helvetica', 'bold')
    doc.text('Invoice', 20, 52)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#9ca3af')
    doc.text(inv.invoice_number, 20, 59)
    doc.text(`${formatDate(inv.issue_date)}${inv.due_date ? `  ·  Due ${formatDate(inv.due_date)}` : ''}`, 20, 65)

    // Billed to (right side)
    doc.setTextColor('#9ca3af'); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('BILLED TO', 140, 46)
    doc.setTextColor('#111827'); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(inv.client_name, 140, 53)
    let cy = 59
    if (inv.client_email) { doc.setTextColor('#9ca3af'); doc.setFontSize(9); doc.text(inv.client_email, 140, cy); cy += 5 }
    if (inv.client_address) { doc.setTextColor('#6b7280'); doc.setFontSize(9); doc.text(inv.client_address, 140, cy, { maxWidth: 55 }); cy += 5 }
    if (inv.client_gstin) { doc.setTextColor('#6b7280'); doc.setFontSize(8); doc.text(`GSTIN: ${inv.client_gstin}`, 140, cy) }

    // Table
    let y = 78
    doc.setDrawColor(229, 231, 235); doc.line(20, y, 190, y)
    y += 8
    doc.setTextColor('#9ca3af'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('ITEM', 20, y); doc.text('QTY', 120, y, { align: 'right' })
    doc.text('RATE', 152, y, { align: 'right' }); doc.text('TOTAL', 185, y, { align: 'right' })
    y += 6; doc.line(20, y, 190, y); y += 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#374151')
    inv.items.forEach(item => {
      if (y > 250) { doc.addPage(); doc.setFillColor(252, 252, 252); doc.rect(0, 0, 210, 297, 'F'); y = 20 }
      doc.text(item.description, 20, y)
      doc.text(String(item.qty), 120, y, { align: 'right' })
      doc.text(formatCurrency(item.rate), 152, y, { align: 'right' })
      doc.text(formatCurrency(item.qty * item.rate), 185, y, { align: 'right' })
      y += 10
    })
    doc.setDrawColor(229, 231, 235); doc.line(20, y, 190, y); y += 10
    doc.setFontSize(10); doc.setTextColor('#6b7280')
    doc.text('Subtotal', 152, y, { align: 'right' }); doc.setTextColor('#111827'); doc.text(formatCurrency(inv.subtotal), 185, y, { align: 'right' })
    if (showGst) {
      const isIgst = gstin && inv.client_gstin && gstin.substring(0, 2) !== inv.client_gstin.substring(0, 2)
      if (isIgst) {
        y += 8; doc.setTextColor('#6b7280'); doc.text(`IGST ${inv.gst_rate}%`, 152, y, { align: 'right' }); doc.setTextColor('#111827'); doc.text(formatCurrency(inv.gst_amount), 185, y, { align: 'right' })
      } else {
        y += 8; doc.setTextColor('#6b7280'); doc.text(`CGST ${inv.gst_rate / 2}%`, 152, y, { align: 'right' }); doc.setTextColor('#111827'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
        y += 7; doc.setTextColor('#6b7280'); doc.text(`SGST ${inv.gst_rate / 2}%`, 152, y, { align: 'right' }); doc.setTextColor('#111827'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
      }
    }
    y += 12; doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor('#111827')
    doc.text('Total', 152, y, { align: 'right' }); doc.text(formatCurrency(displayTotal), 185, y, { align: 'right' })
    if (inv.notes) { y += 20; doc.setTextColor('#9ca3af'); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(inv.notes, 20, y, { maxWidth: 170 }) }
    doc.setTextColor('#e5e7eb'); doc.setFontSize(7); doc.text('FinSight AI', 105, 290, { align: 'center' })

  } else {
    // ===== MODERN DARK =====
    doc.setFillColor(15, 15, 26); doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(99, 102, 241); doc.rect(0, 0, 210, 42, 'F')

    doc.setTextColor('#ffffff'); doc.setFontSize(22); doc.setFont('helvetica', 'bold')
    doc.text(company, 20, 22)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(address || 'Professional Invoice', 20, 30)
    if (gstin) { doc.setFontSize(8); doc.text(`GSTIN: ${gstin}`, 20, 37) }

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 148, 22)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`# ${inv.invoice_number}`, 148, 30)

    // Bill to section
    let y = 52
    doc.setTextColor('#94a3b8'); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('BILL TO', 20, y)
    doc.text('DATES', 130, y)
    y += 7
    doc.setTextColor('#f1f5f9'); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(inv.client_name, 20, y)
    doc.setTextColor('#94a3b8'); doc.setFontSize(9)
    doc.text(`Issue: ${formatDate(inv.issue_date)}`, 130, y)
    y += 6
    if (inv.client_email) { doc.setTextColor('#94a3b8'); doc.setFontSize(9); doc.text(inv.client_email, 20, y) }
    if (inv.due_date) { doc.text(`Due:   ${formatDate(inv.due_date)}`, 130, y) }
    y += 6
    if (inv.client_address) { doc.setTextColor('#64748b'); doc.setFontSize(9); doc.text(inv.client_address, 20, y, { maxWidth: 90 }); y += 5 }
    if (inv.client_gstin) { doc.setTextColor('#818cf8'); doc.setFontSize(8); doc.text(`GSTIN: ${inv.client_gstin}`, 20, y); y += 5 }

    // Table
    y += 6
    doc.setFillColor(30, 30, 46); doc.rect(20, y, 170, 10, 'F')
    doc.setTextColor('#94a3b8'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Description', 25, y + 7)
    doc.text('Qty', 120, y + 7, { align: 'right' })
    doc.text('Rate', 150, y + 7, { align: 'right' })
    doc.text('Amount', 185, y + 7, { align: 'right' })
    y += 16; doc.setFont('helvetica', 'normal'); doc.setFontSize(10)

    inv.items.forEach(item => {
      if (y > 250) { doc.addPage(); doc.setFillColor(15, 15, 26); doc.rect(0, 0, 210, 297, 'F'); y = 20 }
      doc.setTextColor('#e2e8f0')
      doc.text(item.description, 25, y)
      doc.text(String(item.qty), 120, y, { align: 'right' })
      doc.text(formatCurrency(item.rate), 150, y, { align: 'right' })
      doc.text(formatCurrency(item.qty * item.rate), 185, y, { align: 'right' })
      doc.setDrawColor(40, 40, 62); doc.line(20, y + 4, 190, y + 4)
      y += 12
    })

    // Summary
    y += 8; doc.setFontSize(10)
    doc.setTextColor('#94a3b8'); doc.text('Subtotal:', 150, y, { align: 'right' })
    doc.setTextColor('#ffffff'); doc.text(formatCurrency(inv.subtotal), 185, y, { align: 'right' })
    if (showGst) {
      const isIgst = gstin && inv.client_gstin && gstin.substring(0, 2) !== inv.client_gstin.substring(0, 2)
      if (isIgst) {
        y += 8; doc.setTextColor('#94a3b8'); doc.text(`IGST (${inv.gst_rate}%):`, 150, y, { align: 'right' })
        doc.setTextColor('#ffffff'); doc.text(formatCurrency(inv.gst_amount), 185, y, { align: 'right' })
      } else {
        y += 8; doc.setTextColor('#94a3b8'); doc.text(`CGST (${inv.gst_rate / 2}%):`, 150, y, { align: 'right' })
        doc.setTextColor('#ffffff'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
        y += 7; doc.setTextColor('#94a3b8'); doc.text(`SGST (${inv.gst_rate / 2}%):`, 150, y, { align: 'right' })
        doc.setTextColor('#ffffff'); doc.text(formatCurrency(inv.gst_amount / 2), 185, y, { align: 'right' })
      }
    }
    y += 10
    doc.setFillColor(99, 102, 241); doc.roundedRect(130, y - 5, 60, 16, 3, 3, 'F')
    doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('TOTAL', 137, y + 5)
    doc.text(formatCurrency(displayTotal), 185, y + 5, { align: 'right' })

    if (inv.notes) {
      y += 24; doc.setFontSize(9); doc.setTextColor('#94a3b8'); doc.setFont('helvetica', 'bold')
      doc.text('NOTES:', 20, y); doc.setFont('helvetica', 'normal')
      doc.text(inv.notes, 20, y + 8, { maxWidth: 170 })
    }
    doc.setFontSize(8); doc.setTextColor('#475569')
    doc.text('Thank you for your business!', 105, 285, { align: 'center' })
    doc.text('Generated by FinSight AI', 105, 291, { align: 'center' })
  }

  doc.save(`FinSight_Invoice_${inv.invoice_number}.pdf`)
}

// ============== STATUS CONFIG ==============
const STATUS_CONFIG: Record<string, { badge: string; icon: any; label: string }> = {
  pending: { badge: 'badge-yellow', icon: Clock, label: 'Pending' },
  paid: { badge: 'badge-green', icon: Check, label: 'Paid' },
  overdue: { badge: 'badge-red', icon: AlertCircle, label: 'Overdue' },
}

// ============== PAGE COMPONENT ==============
export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [businessInfo, setBusinessInfo] = useState({ company: '', address: '', gstin: '' })
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', qty: 1, rate: 0 }])
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_address: '', client_gstin: '',
    gst_rate: '18', status: 'pending',
    issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: ''
  })

  // Filter & search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Download modal
  const [downloadInv, setDownloadInv] = useState<Invoice | null>(null)
  const [dlTemplate, setDlTemplate] = useState<InvoiceTemplate>('modern_dark')
  const [dlIncludeGst, setDlIncludeGst] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.user_metadata?.full_name || user.email || '')
    const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setInvoices(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const gstAmt = subtotal * (parseFloat(form.gst_rate) / 100)
  const total = subtotal + gstAmt

  // Sequential invoice numbering: INV-YYYYMMDD-CLI-001, 002, 003...
  function getNextInvoiceNumber(clientName: string, issueDate: string): string {
    const datePart = issueDate.replace(/-/g, '')
    const clientPart = clientName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'GEN'
    const monthPrefix = `INV-${datePart.slice(0, 6)}`
    const existingThisMonth = invoices.filter(i => i.invoice_number.startsWith(monthPrefix))
    const nextSerial = (existingThisMonth.length + 1).toString().padStart(3, '0')
    return `INV-${datePart}-${clientPart}-${nextSerial}`
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const num = getNextInvoiceNumber(form.client_name, form.issue_date)
    await supabase.from('invoices').insert({
      user_id: user.id, invoice_number: num,
      client_name: form.client_name, client_email: form.client_email,
      client_address: form.client_address || null, client_gstin: form.client_gstin || null,
      items, gst_rate: parseFloat(form.gst_rate), subtotal, gst_amount: gstAmt, total,
      status: form.status, issue_date: form.issue_date, due_date: form.due_date || null, notes: form.notes
    })
    setSaving(false); setShowModal(false)
    setItems([{ description: '', qty: 1, rate: 0 }])
    setForm({ client_name: '', client_email: '', client_address: '', client_gstin: '', gst_rate: '18', status: 'pending', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' })
    load()
  }

  async function updateStatus(id: string, status: string, totalAmt: number, num: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('invoices').update({ status }).eq('id', id)
    if (status === 'paid' && user) {
      await supabase.from('transactions').insert({
        user_id: user.id, type: 'income', amount: totalAmt,
        category: 'Business', description: `Invoice Payment: ${num}`,
        date: new Date().toISOString()
      })
    }
    setInvoices(inv => inv.map(i => i.id === id ? { ...i, status } : i))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice permanently?')) return
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(inv => inv.filter(i => i.id !== id))
  }

  // Filtered invoices
  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q) ||
        (inv.client_email && inv.client_email.toLowerCase().includes(q))
    }
    return true
  })

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.total), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Invoices</h1><p className="text-slate-500 text-sm">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Invoice</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card"><span className="stat-label">Pending</span><span className="stat-value text-yellow-400">{formatCurrency(totalPending)}</span></div>
        <div className="stat-card"><span className="stat-label">Collected</span><span className="stat-value text-emerald-400">{formatCurrency(totalPaid)}</span></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="input pl-9 py-2.5 text-sm" placeholder="Search invoices..." />
        </div>
        <div className="flex gap-1 bg-[#0f0f1a] rounded-xl p-1">
          {['all', 'pending', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-slate-400 font-medium mb-1">{invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}</p>
          {invoices.length === 0 && <button onClick={() => setShowModal(true)} className="btn-primary mx-auto mt-3"><Plus size={16} /> Create Invoice</button>}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e2e]">
              {['Invoice #', 'Client', 'Amount', 'Status', 'Due', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1e1e2e]">
              {filtered.map(inv => {
                const s = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending
                return (
                  <tr key={inv.id} className="hover:bg-[#1a1a2e] transition-colors group">
                    <td className="px-5 py-3.5 text-indigo-400 font-medium">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-white">{inv.client_name}</p>
                      <p className="text-xs text-slate-500">{inv.client_email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">{formatCurrency(inv.total)}</td>
                    <td className="px-5 py-3.5">
                      <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value, inv.total, inv.invoice_number)}
                        className={`badge ${s.badge} bg-transparent border-none cursor-pointer text-xs font-semibold`}>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setDownloadInv(inv); setDlIncludeGst(!!businessInfo.gstin) }}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors p-1.5 hover:bg-indigo-500/10 rounded-lg" title="Download PDF">
                          <Download size={15} />
                        </button>
                        <button onClick={() => handleDelete(inv.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Download / Print Modal ===== */}
      {downloadInv && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Download Invoice</h2>
              <button onClick={() => setDownloadInv(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>

            <p className="text-sm text-slate-400 mb-4">Invoice <span className="text-indigo-400 font-medium">{downloadInv.invoice_number}</span> for <span className="text-white">{downloadInv.client_name}</span></p>

            {/* Template selector */}
            <div className="mb-4">
              <label className="label text-xs mb-2">Choose Template</label>
              <div className="grid grid-cols-3 gap-2">
                {([['modern_dark', '🌙 Modern Dark'], ['classic_white', '📄 Classic White'], ['minimal', '✨ Minimal']] as const).map(([id, name]) => (
                  <button key={id} onClick={() => setDlTemplate(id)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all ${dlTemplate === id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-[#1e1e2e] text-slate-500 hover:text-white hover:border-[#2a2a3e]'}`}>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Business info */}
            <div className="bg-[#0f0f1a] rounded-xl p-3 space-y-2 mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Business Details</p>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={businessInfo.company} onChange={e => setBusinessInfo(b => ({ ...b, company: e.target.value }))} className="input text-xs py-2" placeholder="Company name" />
                <input type="text" value={businessInfo.address} onChange={e => setBusinessInfo(b => ({ ...b, address: e.target.value }))} className="input text-xs py-2" placeholder="Address" />
                <input type="text" value={businessInfo.gstin} onChange={e => setBusinessInfo(b => ({ ...b, gstin: e.target.value }))} className="input text-xs py-2" placeholder="Your GSTIN" />
              </div>
            </div>

            {/* GST toggle — only show if user has GSTIN */}
            {businessInfo.gstin && (
              <div className="flex items-center justify-between bg-[#0f0f1a] rounded-xl p-3 mb-4">
                <div>
                  <p className="text-sm text-white font-medium">Include GST</p>
                  <p className="text-[10px] text-slate-500">Only applicable for GST-registered suppliers</p>
                </div>
                <button onClick={() => setDlIncludeGst(!dlIncludeGst)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 ${dlIncludeGst ? 'bg-indigo-600' : 'bg-[#2a2a3e]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${dlIncludeGst ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}

            <button onClick={() => { downloadPDF(downloadInv, dlTemplate, businessInfo, dlIncludeGst); setDownloadInv(null) }}
              className="btn-primary w-full justify-center">
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ===== Create Invoice Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl animate-fade-in overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Create Invoice</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Client Name *</label>
                  <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input" placeholder="Company / Person" required />
                </div>
                <div>
                  <label className="label">Client Email</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} className="input" placeholder="client@email.com" />
                </div>
                <div>
                  <label className="label">Client Address <span className="text-slate-600 text-[10px]">Place of Supply</span></label>
                  <input type="text" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} className="input" placeholder="City, State" />
                </div>
                <div>
                  <label className="label">Client GSTIN <span className="text-slate-600 text-[10px]">Optional</span></label>
                  <input type="text" value={form.client_gstin} onChange={e => setForm(f => ({ ...f, client_gstin: e.target.value.toUpperCase() }))} className="input" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="label">Line Items</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
                    <span className="col-span-6">Description</span><span className="col-span-2">Qty</span><span className="col-span-3">Rate (₹)</span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input className="input col-span-6 text-sm py-2" value={item.description} onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Service description" required />
                      <input type="number" className="input col-span-2 text-sm py-2" value={item.qty} min={1} onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, qty: parseInt(e.target.value) } : x))} />
                      <input type="number" className="input col-span-3 text-sm py-2" value={item.rate || ''} onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, rate: parseFloat(e.target.value) } : x))} placeholder="0" />
                      {items.length > 1 && <button type="button" onClick={() => setItems(it => it.filter((_, j) => j !== i))} className="col-span-1 text-slate-600 hover:text-red-400 transition-colors"><X size={14} /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setItems(it => [...it, { description: '', qty: 1, rate: 0 }])} className="btn-secondary text-xs py-2 mt-1"><Plus size={13} /> Add Item</button>
                </div>
              </div>

              {/* Dates & GST */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">GST Rate (%)</label>
                  <input type="number" value={form.gst_rate} onChange={e => setForm(f => ({ ...f, gst_rate: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Issue Date</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#0f0f1a] rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-slate-400"><span>GST ({form.gst_rate}%)</span><span>{formatCurrency(gstAmt)}</span></div>
                <div className="flex justify-between font-bold text-white text-base pt-1 border-t border-[#1e1e2e] mt-1"><span>Total</span><span className="text-indigo-400">{formatCurrency(total)}</span></div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Payment terms, bank details, etc." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : '📄 Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
