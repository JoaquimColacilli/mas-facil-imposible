/**
 * Standalone oklch() → hex converter. Lives here because html-to-image
 * (used to snapshot the share card to PNG) doesn't reliably render `oklch()`
 * colors inside foreignObject SVG, so we walk the DOM and bake colors to hex
 * at snapshot time. Implemented from the CSS Color Module 4 reference matrix
 * — no external dependency.
 *
 * `oklch(L C H)` and `oklch(L C H / A)` are accepted; L is unitless 0..1
 * (matching how PERSONALITIES expresses it). Anything that isn't oklch is
 * returned unchanged so callers can pass arbitrary CSS values.
 */

const OKLCH_RE = /oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/i

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function linearToSRGB(c: number): number {
  const sign = c < 0 ? -1 : 1
  const abs = Math.abs(c)
  return abs >= 0.0031308
    ? sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055)
    : sign * 12.92 * abs
}

function oklchToOklab(L: number, C: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180
  return [L, C * Math.cos(rad), C * Math.sin(rad)]
}

function oklabToLinearSRGB(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

function toHex(n: number): string {
  return Math.round(clamp01(n) * 255)
    .toString(16)
    .padStart(2, '0')
}

export function oklchToHex(input: string): string {
  const m = input.match(OKLCH_RE)
  if (!m) return input
  const L = parseFloat(m[1]) > 1 ? parseFloat(m[1]) / 100 : parseFloat(m[1])
  const C = parseFloat(m[2])
  const H = parseFloat(m[3])
  const aRaw = m[4]
  const A = aRaw == null ? 1 : aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw)

  const [Lab_L, lab_a, lab_b] = oklchToOklab(L, C, H)
  const [r_lin, g_lin, b_lin] = oklabToLinearSRGB(Lab_L, lab_a, lab_b)
  const r = clamp01(linearToSRGB(r_lin))
  const g = clamp01(linearToSRGB(g_lin))
  const b = clamp01(linearToSRGB(b_lin))
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  return A < 1 ? `${base}${toHex(A)}` : base
}

/** Replace every `oklch(...)` substring in `css` with its hex equivalent. */
export function bakeOklchStrings(css: string): string {
  return css.replace(/oklch\([^)]+\)/gi, (m) => oklchToHex(m))
}

/**
 * Walks `root` and every descendant, rewriting any `oklch()` expressions in
 * inline styles, SVG fill/stroke/stop-color attributes, and stop-color
 * properties into hex equivalents. Mutates the tree in place.
 *
 * Designed to be run on a temporarily-mounted off-screen tree right before
 * snapshotting — we never touch the live UI.
 */
export function bakeOklchInTree(root: HTMLElement): void {
  const elements: Element[] = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const el of elements) {
    const html = el as HTMLElement
    if (html.style && html.style.cssText && html.style.cssText.includes('oklch(')) {
      html.style.cssText = bakeOklchStrings(html.style.cssText)
    }
    for (const attr of ['fill', 'stroke', 'stop-color', 'flood-color', 'color']) {
      const v = el.getAttribute(attr)
      if (v && v.includes('oklch(')) {
        el.setAttribute(attr, bakeOklchStrings(v))
      }
    }
  }
}
