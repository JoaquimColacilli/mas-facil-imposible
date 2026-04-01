import type { Transaction, Goal, Loan, Debt, TransactionType, Currency } from '@/lib/types'
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/lib/types'
export { getPreviousMonthRange } from '@/lib/month-utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
}

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  completed: 'Completada',
  paused: 'Pausada',
}

function fmtMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  return `${symbol} ${formatted}`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── Summary builders ────────────────────────────────────────────────────────

type TypeSummary = { type: string; ars: number; usd: number }
type CategorySummary = { category: string; type: string; ars: number; usd: number }

function buildTypeSummary(transactions: Transaction[]): TypeSummary[] {
  const map = new Map<TransactionType, { ars: number; usd: number }>()
  for (const t of transactions) {
    if (t.status === 'cancelled') continue
    const entry = map.get(t.type) ?? { ars: 0, usd: 0 }
    if (t.currency === 'ARS') entry.ars += t.amount
    else entry.usd += t.amount
    map.set(t.type, entry)
  }
  return Array.from(map.entries()).map(([type, vals]) => ({
    type: TRANSACTION_TYPE_LABELS[type],
    ...vals,
  }))
}

function buildCategorySummary(transactions: Transaction[]): CategorySummary[] {
  const map = new Map<string, { type: string; ars: number; usd: number }>()
  for (const t of transactions) {
    if (t.status === 'cancelled') continue
    const catName = t.category?.name ?? 'Sin categoría'
    const key = `${catName}__${t.type}`
    const entry = map.get(key) ?? { type: TRANSACTION_TYPE_LABELS[t.type], ars: 0, usd: 0 }
    if (t.currency === 'ARS') entry.ars += t.amount
    else entry.usd += t.amount
    map.set(key, entry)
  }
  return Array.from(map.entries())
    .map(([key, vals]) => ({
      category: key.split('__')[0],
      ...vals,
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

// ─── Excel Generation ────────────────────────────────────────────────────────

export async function generateExcel(
  transactions: Transaction[],
  goals: Goal[],
  loans: Loan[],
  debts: Debt[],
  monthLabel: string,
) {
  const XLSX = await import('xlsx')

  // Sheet 1: Movimientos
  const txRows = transactions.map((t) => ({
    Fecha: fmtDate(t.date),
    Tipo: TRANSACTION_TYPE_LABELS[t.type],
    Categoría: t.category?.name ?? '',
    Monto: t.amount,
    Moneda: t.currency,
    'Monto Formateado': fmtMoney(t.amount, t.currency),
    Nota: t.note ?? '',
    Estado: STATUS_LABELS[t.status] ?? t.status,
  }))
  const wsMovimientos = XLSX.utils.json_to_sheet(txRows)
  // Set column widths
  wsMovimientos['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
    { wch: 8 }, { wch: 16 }, { wch: 30 }, { wch: 12 },
  ]

  // Sheet 2: Resumen por Categoría
  const catSummary = buildCategorySummary(transactions)
  const wsCat = XLSX.utils.json_to_sheet(
    catSummary.map((c) => ({
      Categoría: c.category,
      Tipo: c.type,
      'Total ARS': c.ars > 0 ? fmtMoney(c.ars, 'ARS') : '-',
      'Total USD': c.usd > 0 ? fmtMoney(c.usd, 'USD') : '-',
    })),
  )
  wsCat['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }]

  // Sheet 3: Resumen por Tipo
  const typeSummary = buildTypeSummary(transactions)
  const wsType = XLSX.utils.json_to_sheet(
    typeSummary.map((s) => ({
      Tipo: s.type,
      'Total ARS': s.ars > 0 ? fmtMoney(s.ars, 'ARS') : '-',
      'Total USD': s.usd > 0 ? fmtMoney(s.usd, 'USD') : '-',
    })),
  )
  wsType['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }]

  // Sheet 4: Metas
  const wsGoals = XLSX.utils.json_to_sheet(
    goals.map((g) => ({
      Meta: g.name,
      'Monto Objetivo': fmtMoney(g.target_amount, g.currency),
      'Monto Actual': fmtMoney(g.current_amount, g.currency),
      Progreso: `${Math.round((g.current_amount / g.target_amount) * 100)}%`,
      Estado: GOAL_STATUS_LABELS[g.status] ?? g.status,
      Fecha_Límite: g.deadline ? fmtDate(g.deadline) : '-',
    })),
  )
  wsGoals['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]

  // Sheet 5: Préstamos y Deudas
  const loanDebtRows = [
    ...loans.map((l) => ({
      Tipo: 'Préstamo (te deben)',
      Persona: l.person_name,
      Monto: fmtMoney(l.amount, l.currency),
      Fecha: fmtDate(l.date),
      Nota: l.note ?? '',
      Pagado: l.paid ? 'Sí' : 'No',
    })),
    ...debts.map((d) => ({
      Tipo: 'Deuda (debés)',
      Persona: d.person_name,
      Monto: fmtMoney(d.amount, d.currency),
      Fecha: fmtDate(d.date),
      Nota: d.note ?? '',
      Pagado: d.paid ? 'Sí' : 'No',
    })),
  ]
  const wsLoans = XLSX.utils.json_to_sheet(loanDebtRows)
  wsLoans['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 24 }, { wch: 8 }]

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos')
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoría')
  XLSX.utils.book_append_sheet(wb, wsType, 'Por Tipo')
  XLSX.utils.book_append_sheet(wb, wsGoals, 'Metas')
  XLSX.utils.book_append_sheet(wb, wsLoans, 'Préstamos y Deudas')

  // Download
  const fileName = `MFI_Resumen_${monthLabel.replace(/\s+/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

export async function generatePDF(
  transactions: Transaction[],
  goals: Goal[],
  loans: Loan[],
  debts: Debt[],
  monthLabel: string,
) {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('MFI — Resumen Mensual', pageWidth / 2, 20, { align: 'center' })
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), pageWidth / 2, 28, { align: 'center' })

  // ── KPI Summary
  const typeSummary = buildTypeSummary(transactions)
  let y = 38

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen General', 14, y)
  y += 2

  const kpiRows = typeSummary.map((s) => [
    s.type,
    s.ars > 0 ? fmtMoney(s.ars, 'ARS') : '-',
    s.usd > 0 ? fmtMoney(s.usd, 'USD') : '-',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Total ARS', 'Total USD']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [80, 120, 90], fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Movimientos
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Movimientos', 14, y)
  y += 2

  const txBody = transactions.map((t) => [
    fmtDate(t.date),
    TRANSACTION_TYPE_LABELS[t.type],
    t.category?.name ?? '',
    fmtMoney(t.amount, t.currency),
    t.note ? (t.note.length > 30 ? t.note.slice(0, 30) + '…' : t.note) : '',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Tipo', 'Categoría', 'Monto', 'Nota']],
    body: txBody,
    theme: 'striped',
    headStyles: { fillColor: [80, 120, 90], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Por Categoría
  const catSummary = buildCategorySummary(transactions)
  if (catSummary.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen por Categoría', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Categoría', 'Tipo', 'Total ARS', 'Total USD']],
      body: catSummary.map((c) => [
        c.category,
        c.type,
        c.ars > 0 ? fmtMoney(c.ars, 'ARS') : '-',
        c.usd > 0 ? fmtMoney(c.usd, 'USD') : '-',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [80, 120, 90], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── Metas
  if (goals.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Metas', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Meta', 'Objetivo', 'Actual', 'Progreso', 'Estado']],
      body: goals.map((g) => [
        g.name,
        fmtMoney(g.target_amount, g.currency),
        fmtMoney(g.current_amount, g.currency),
        `${Math.round((g.current_amount / g.target_amount) * 100)}%`,
        GOAL_STATUS_LABELS[g.status] ?? g.status,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [80, 120, 90], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── Préstamos y Deudas
  const loanDebtRows = [
    ...loans.map((l) => ['Préstamo', l.person_name, fmtMoney(l.amount, l.currency), l.paid ? 'Sí' : 'No']),
    ...debts.map((d) => ['Deuda', d.person_name, fmtMoney(d.amount, d.currency), d.paid ? 'Sí' : 'No']),
  ]
  if (loanDebtRows.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Préstamos y Deudas', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Persona', 'Monto', 'Pagado']],
      body: loanDebtRows,
      theme: 'grid',
      headStyles: { fillColor: [80, 120, 90], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `MFI — Generado el ${new Date().toLocaleDateString('es-AR')} — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    )
  }

  const fileName = `MFI_Resumen_${monthLabel.replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}
