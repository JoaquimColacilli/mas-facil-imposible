'use client'

/**
 * Multi-page PDF export of the Wrapped — one page per slide (1–10). Uses
 * jsPDF native drawing (no DOM snapshot, no html-to-image) so we sidestep
 * the oklch-in-foreignObject pipeline that kept producing a black PNG.
 *
 * Each page recreates the corresponding slide's key content in a simplified
 * editorial format: gradient background + header + hero + a stats block.
 * Colors are the slide's palette converted from oklch to hex at draw time.
 *
 * Emojis are intentionally stripped — the standard PDF core fonts (Helvetica,
 * Times, Courier) don't have glyphs for Unicode emoji, so leaving them in
 * produces `&-þ&`-style tofu. We communicate the personality through text
 * and color instead.
 */

import type { WrappedData } from './types'
import { PERSONALITIES } from './personalities'
import { oklchToHex } from './oklch'
import { fmtARS, fmtNum, fmtPct, fmtUSD } from './formatters'

// 4:5 portrait, matches the "feed" share card ratio.
const W = 180
const H = 225
const MARGIN = 14

// ─── Utilities ──────────────────────────────────────────────────────────────

function rgb(hex: string): string {
  // bakeOklchStrings can emit 8-char hex with alpha; jsPDF ignores alpha.
  return hex.length === 9 ? hex.slice(0, 7) : hex
}

function hexToTuple(hex: string): [number, number, number] {
  const h = rgb(hex).replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Strip emoji / pictographic characters so jsPDF core fonts don't tofu. */
function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0E}-\u{FE0F}]/gu,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

type JsPDFInstance = {
  setFillColor: (r: number, g: number, b: number) => void
  setDrawColor: (r: number, g: number, b: number) => void
  setTextColor: (r: number, g: number, b: number) => void
  setFont: (family: string, style?: string) => void
  setFontSize: (size: number) => void
  setLineWidth: (w: number) => void
  rect: (x: number, y: number, w: number, h: number, style?: string) => void
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  text: (text: string | string[], x: number, y: number, options?: { align?: string }) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  getTextWidth: (text: string) => number
  addPage: (format?: [number, number] | string, orientation?: string) => unknown
  save: (filename: string) => void
  setGState?: (state: unknown) => void
  GState?: new (opts: { opacity: number }) => unknown
}

// ─── Page-level building blocks ─────────────────────────────────────────────

function drawGradientBackground(doc: JsPDFInstance, from: string, to: string): void {
  const [r1, g1, b1] = hexToTuple(from)
  const [r2, g2, b2] = hexToTuple(to)
  const BANDS = 60
  const bandH = H / BANDS
  for (let i = 0; i < BANDS; i++) {
    const t = i / (BANDS - 1)
    doc.setFillColor(
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    )
    // +1mm overdraw avoids hairline seams between bands in AA-ing viewers.
    doc.rect(0, i * bandH, W, bandH + 1, 'F')
  }
}

function drawHeader(doc: JsPDFInstance, data: WrappedData): void {
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('MFI', MARGIN, MARGIN + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const right = `${data.month.toUpperCase()} · ${data.year}`
  doc.text(right, W - MARGIN - doc.getTextWidth(right), MARGIN + 4)
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.15)
  doc.line(MARGIN, MARGIN + 7, W - MARGIN, MARGIN + 7)
}

function drawPageNumber(doc: JsPDFInstance, idx: number, total = 10): void {
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const s = `${String(idx).padStart(2, '0')} / ${total}`
  doc.text(s, W - MARGIN, H - MARGIN + 4, { align: 'right' })
}

function drawFooter(doc: JsPDFInstance, data: WrappedData): void {
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(stripEmoji(data.user.name), MARGIN, H - MARGIN + 4)
}

function drawEyebrow(doc: JsPDFInstance, text: string, y: number): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text(text.toUpperCase(), MARGIN, y)
}

function drawHero(
  doc: JsPDFInstance,
  text: string,
  y: number,
  opts: { size?: number; color?: [number, number, number] } = {},
): number {
  const size = opts.size ?? 26
  const [r, g, b] = opts.color ?? [255, 255, 255]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(r, g, b)
  const lines = doc.splitTextToSize(stripEmoji(text), W - MARGIN * 2)
  doc.text(lines, MARGIN, y)
  // Return the y cursor after the block. jsPDF text baseline ≈ 0.35 × size
  // in mm from the top of its glyph box, so we advance by ~0.45 per line.
  return y + lines.length * size * 0.45
}

function drawSubtitle(doc: JsPDFInstance, text: string, y: number, maxWidth: number = W - MARGIN * 2): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  const lines = doc.splitTextToSize(stripEmoji(text), maxWidth)
  doc.text(lines, MARGIN, y)
  return y + lines.length * 5
}

function drawStatCard(
  doc: JsPDFInstance,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
): void {
  if (doc.setGState && doc.GState) {
    doc.setGState(new doc.GState({ opacity: 0.14 }))
  }
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F')
  if (doc.setGState && doc.GState) {
    doc.setGState(new doc.GState({ opacity: 1 }))
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(label.toUpperCase(), x + 3.5, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const v = doc.splitTextToSize(stripEmoji(value), w - 6)
  doc.text(v.slice(0, 1), x + 3.5, y + 14.5)
}

// ─── Per-slide renderers ────────────────────────────────────────────────────

function page1Portada(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#2b3560', '#4a5a7e')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Tu mes en MFI', 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(48)
  doc.setTextColor(255, 255, 255)
  doc.text(data.month, MARGIN, 90)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(String(data.year), MARGIN, 104)
  drawSubtitle(
    doc,
    `Hola ${data.user.name.split(' ')[0] || 'vos'}. Un recorrido por tus ${data.totals.movements} movimientos del mes.`,
    130,
    W - MARGIN * 2,
  )
  drawPageNumber(doc, 1)
  drawFooter(doc, data)
}

function page2Numeros(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#2c3e60', '#456a7d')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Los números del mes', 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(72)
  doc.setTextColor(255, 255, 255)
  doc.text(fmtNum(data.totals.movements), MARGIN, 110)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text('movimientos registrados', MARGIN, 120)
  // Cards volumen
  const cellW = (W - MARGIN * 2 - 4) / 2
  drawStatCard(doc, MARGIN, 140, cellW, 22, 'Volumen ARS', fmtARS(data.totals.flowARS))
  drawStatCard(doc, MARGIN + cellW + 4, 140, cellW, 22, 'Volumen USD', fmtUSD(data.totals.flowUSD))
  drawPageNumber(doc, 2)
  drawFooter(doc, data)
}

function page3Balance(doc: JsPDFInstance, data: WrappedData): void {
  const pos = data.balance.ars >= 0
  drawGradientBackground(doc, pos ? '#1f6b4a' : '#8c2a2a', pos ? '#2a7690' : '#3a4773')
  drawHeader(doc, data)
  drawEyebrow(doc, pos ? 'Terminaste el mes con' : 'Cerraste el mes con', 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(40)
  doc.setTextColor(...(pos ? ([200, 240, 210] as [number, number, number]) : ([240, 210, 200] as [number, number, number])))
  doc.text(fmtARS(data.balance.ars, true), MARGIN, 90)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${pos ? 'a favor' : 'en rojo'} · ${fmtUSD(data.balance.usd)}`, MARGIN, 102)
  const cellW = (W - MARGIN * 2 - 4) / 2
  drawStatCard(doc, MARGIN, 120, cellW, 22, 'Ingresos', fmtARS(data.balance.income))
  drawStatCard(doc, MARGIN + cellW + 4, 120, cellW, 22, 'Gastos', fmtARS(data.balance.expense))
  if (data.balance.deltaVsPrev !== 0) {
    drawStatCard(
      doc,
      MARGIN,
      146,
      W - MARGIN * 2,
      18,
      'vs mes anterior',
      fmtPct(data.balance.deltaVsPrev),
    )
  }
  drawPageNumber(doc, 3)
  drawFooter(doc, data)
}

function page4TopCategory(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#6c3321', '#7f5636')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Donde más gastaste', 56)
  const tc = data.topCategory
  if (!tc) {
    drawSubtitle(doc, 'No registraste gastos este mes.', 80)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(30)
    doc.setTextColor(255, 255, 255)
    const lines = doc.splitTextToSize(stripEmoji(tc.name), W - MARGIN * 2)
    doc.text(lines.slice(0, 2), MARGIN, 84)
    doc.setFontSize(22)
    doc.text(fmtARS(tc.amount), MARGIN, 110)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${tc.pctOfExpenses}% de tus gastos del mes`, MARGIN, 120)
    // Top 3 breakdown
    doc.setFontSize(8)
    doc.text('TOP DEL MES', MARGIN, 140)
    for (let i = 0; i < Math.min(3, tc.breakdown.length); i++) {
      const b = tc.breakdown[i]
      const y = 148 + i * 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`${String(i + 1).padStart(2, '0')}  ${stripEmoji(b.name)}`, MARGIN, y)
      doc.setFont('helvetica', 'normal')
      const right = fmtARS(b.amount)
      doc.text(right, W - MARGIN - doc.getTextWidth(right), y)
    }
  }
  drawPageNumber(doc, 4)
  drawFooter(doc, data)
}

function page5Equivalents(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#6b4526', '#7e5630')
  drawHeader(doc, data)
  if (!data.topCategory || data.equivalents.length === 0) {
    drawEyebrow(doc, 'Equivalencias', 56)
    drawSubtitle(doc, 'Faltaron datos para hacer comparaciones este mes.', 80)
  } else {
    const hero = data.equivalents[0]
    drawEyebrow(doc, `Si no gastabas esos ${fmtARS(data.topCategory.amount)}`, 56)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(56)
    doc.setTextColor(255, 255, 255)
    doc.text(fmtNum(hero.n), MARGIN, 110)
    doc.setFontSize(18)
    doc.text(stripEmoji(hero.label), MARGIN, 125)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`ref. ${fmtARS(hero.ref)} c/u`, MARGIN, 134)
    // Secondary options
    if (data.equivalents.length > 1) {
      doc.setFontSize(8)
      doc.text('TAMBIÉN TE ALCANZABA PARA', MARGIN, 150)
      for (let i = 1; i < Math.min(4, data.equivalents.length); i++) {
        const e = data.equivalents[i]
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(`${fmtNum(e.n)}  ${stripEmoji(e.label)}`, MARGIN, 158 + (i - 1) * 8)
      }
    }
  }
  drawPageNumber(doc, 5)
  drawFooter(doc, data)
}

function page6PeakDay(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#2b2f6d', '#3d5679')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Tu día más caro', 56)
  const pd = data.peakDay
  if (!pd) {
    drawSubtitle(doc, 'Sin gastos diarios que destacar este mes.', 80)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    const dateLines = doc.splitTextToSize(pd.date, W - MARGIN * 2)
    doc.text(dateLines.slice(0, 2), MARGIN, 82)
    doc.setFontSize(34)
    doc.setTextColor(240, 210, 200)
    doc.text(fmtARS(pd.amount), MARGIN, 108)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('en un solo día', MARGIN, 118)
    // Breakdown
    if (pd.items.length > 0) {
      doc.setFontSize(8)
      doc.text('LO QUE PASÓ ESE DÍA', MARGIN, 138)
      for (let i = 0; i < Math.min(3, pd.items.length); i++) {
        const it = pd.items[i]
        const y = 146 + i * 9
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(stripEmoji(it.cat), MARGIN, y)
        doc.setFont('helvetica', 'normal')
        const right = fmtARS(it.amount)
        doc.text(right, W - MARGIN - doc.getTextWidth(right), y)
      }
    }
  }
  drawPageNumber(doc, 6)
  drawFooter(doc, data)
}

function page7Savings(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#1f6b4a', '#3a6a8c')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Apartaste para vos', 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.text('Ahorro & Inversión', MARGIN, 74)

  const sv = data.savings
  // Ahorro: balance histórico + "este mes"
  const balARS = sv.savingsBalanceARS ?? sv.savings ?? 0
  const balUSD = sv.savingsBalanceUSD ?? sv.savingsUSD ?? 0
  const addedARS = sv.savings ?? 0
  const addedUSD = sv.savingsUSD ?? 0
  const ahorroHero =
    balUSD > 0 ? fmtUSD(balUSD) : balARS > 0 ? fmtARS(balARS) : '—'
  const ahorroSub =
    addedUSD !== 0 || addedARS !== 0
      ? `+${addedUSD > 0 ? fmtUSD(addedUSD) : fmtARS(addedARS)} este mes`
      : 'sin movimientos este mes'

  doc.setFontSize(8)
  doc.text('AHORRO · BALANCE TOTAL', MARGIN, 92)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(ahorroHero, MARGIN, 104)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(ahorroSub, MARGIN, 112)

  // Inversión: balance total + ganancia
  const invBalUSD = sv.investmentBalanceUSD ?? 0
  const invBalARS = sv.investmentBalanceARS ?? 0
  const gainUSD = sv.investmentGainUSD ?? 0
  const gainARS = sv.investmentGainARS ?? 0
  const invHero =
    invBalUSD > 0 ? fmtUSD(invBalUSD) : invBalARS > 0 ? fmtARS(invBalARS) : '—'
  const primaryGain = invBalUSD >= invBalARS ? gainUSD : gainARS
  const gainFmt = invBalUSD >= invBalARS ? fmtUSD : (v: number) => fmtARS(v)
  const invSub =
    primaryGain !== 0
      ? `${primaryGain >= 0 ? '+' : '−'}${gainFmt(Math.abs(primaryGain))} este mes`
      : 'sin variación este mes'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('INVERSIÓN · BALANCE TOTAL', MARGIN, 132)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(invHero, MARGIN, 144)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invSub, MARGIN, 152)
  drawPageNumber(doc, 7)
  drawFooter(doc, data)
}

function page8Goals(doc: JsPDFInstance, data: WrappedData): void {
  drawGradientBackground(doc, '#2b3f7a', '#3c5683')
  drawHeader(doc, data)
  drawEyebrow(doc, 'Tu meta', 56)
  const g = data.goal
  if (!g) {
    drawSubtitle(doc, 'Todavía no tenés metas activas. Creá una y seguila acá.', 80)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    const name = doc.splitTextToSize(stripEmoji(g.name), W - MARGIN * 2)
    doc.text(name.slice(0, 2), MARGIN, 82)
    doc.setFontSize(48)
    doc.setTextColor(180, 220, 250)
    doc.text(`${fmtNum(g.pct)}%`, MARGIN, 118)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('completado', MARGIN, 128)
    doc.setFontSize(9)
    doc.text(`${fmtARS(g.current)} de ${fmtARS(g.target)}`, MARGIN, 140)
    if (g.completedThisMonth > 0) {
      doc.setFontSize(9)
      doc.text(
        `Completaste ${g.completedThisMonth} meta${g.completedThisMonth > 1 ? 's' : ''} este mes.`,
        MARGIN,
        150,
      )
    }
  }
  drawPageNumber(doc, 8)
  drawFooter(doc, data)
}

function page9Personality(doc: JsPDFInstance, data: WrappedData): void {
  const p = PERSONALITIES[data.personality]
  drawGradientBackground(doc, rgb(oklchToHex(p.g1)), rgb(oklchToHex(p.g2)))
  drawHeader(doc, data)
  drawEyebrow(doc, 'Tu personalidad del mes', 56)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('SOS', MARGIN, 72)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  const labelLines = doc.splitTextToSize(stripEmoji(p.label), W - MARGIN * 2)
  doc.text(labelLines, MARGIN, 86)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const descLines = doc.splitTextToSize(stripEmoji(p.desc), W - MARGIN * 2)
  doc.text(descLines, MARGIN, 110)
  drawPageNumber(doc, 9)
  drawFooter(doc, data)
}

function page10Closing(doc: JsPDFInstance, data: WrappedData): void {
  const p = PERSONALITIES[data.personality]
  drawGradientBackground(doc, rgb(oklchToHex(p.g1)), rgb(oklchToHex(p.g2)))
  drawHeader(doc, data)
  drawEyebrow(doc, `Tu ${data.month.toLowerCase()} en MFI`, 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(255, 255, 255)
  doc.text('Ese fue tu mes.', MARGIN, 86)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(
    'Gracias por dejarnos acompañarte. Nos vemos el mes que viene.',
    MARGIN,
    104,
  )
  // Summary line
  const cellW = (W - MARGIN * 2 - 4) / 2
  drawStatCard(doc, MARGIN, 130, cellW, 22, 'Balance', fmtARS(data.balance.ars, true))
  drawStatCard(
    doc,
    MARGIN + cellW + 4,
    130,
    cellW,
    22,
    'Top gasto',
    data.topCategory?.name ?? '—',
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('mfi.app', W - MARGIN, H - MARGIN + 4, { align: 'right' })
  drawPageNumber(doc, 10)
  drawFooter(doc, data)
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export async function generateWrappedPDF(data: WrappedData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    unit: 'mm',
    format: [W, H],
    orientation: 'portrait',
  }) as unknown as JsPDFInstance

  const pages = [
    page1Portada,
    page2Numeros,
    page3Balance,
    page4TopCategory,
    page5Equivalents,
    page6PeakDay,
    page7Savings,
    page8Goals,
    page9Personality,
    page10Closing,
  ]

  pages.forEach((renderer, i) => {
    if (i > 0) doc.addPage([W, H], 'portrait')
    renderer(doc, data)
  })

  doc.save(`MFI_Wrapped_${data.monthKey}.pdf`)
}
