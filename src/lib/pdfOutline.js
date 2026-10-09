// Reads course-outline PDFs entirely in the browser.
// Whole-file text pass (no rendering), then a zero-token sieve that keeps
// heading-like lines only. The PDF file itself never leaves the device.
const PDFJS_VERSION = '3.11.174'
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

export const PHONE_CAP = { bytes: 15 * 1024 * 1024, pages: 100 }
export const LAPTOP_CAP = { bytes: 50 * 1024 * 1024, pages: 300 }
export const MAX_TEXT = 15000

export function deviceCap() {
  const coarse =
    (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) ||
    (typeof screen !== 'undefined' && Math.min(screen.width, screen.height) < 768)
  return coarse ? { ...PHONE_CAP, label: 'phone' } : { ...LAPTOP_CAP, label: 'laptop' }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error('cdn failed'))
    document.head.appendChild(s)
  })
}

let pdfjsPromise = null
export function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = loadScript(PDFJS_URL).then(() => {
      const lib = window.pdfjsLib
      if (!lib) throw new Error('cdn failed')
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL
      return lib
    })
  }
  return pdfjsPromise
}

async function isPdf(file) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return String.fromCharCode(...head) === '%PDF-'
}

const HEAD_PATTERN = /^(week|chapter|topic|unit|module|part|section|lesson)\b/i
const NUM_PATTERN = /^\d{1,2}([.\)]\s|:)/

function groupLines(items) {
  const rows = new Map()
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const y = Math.round(it.transform[5])
    const size = Math.abs(it.transform[3]) || 0
    const bold = /bold|black|demi|heavy/i.test(it.fontName || '')
    if (!rows.has(y)) rows.set(y, { text: '', size: 0, bold: false })
    const row = rows.get(y)
    row.text += it.str
    row.size = Math.max(row.size, size)
    row.bold = row.bold || bold
  }
  return [...rows.values()]
    .map((r) => ({ ...r, text: r.text.replace(/\s+/g, ' ').trim() }))
    .filter((r) => r.text.length > 0)
}

// Zero-token sieve: body size by most common size, keep heading-like lines.
function sieve(allLines) {
  const freq = {}
  for (const l of allLines) {
    const k = Math.round(l.size) || 0
    freq[k] = (freq[k] || 0) + l.text.length
  }
  let body = 0
  let best = -1
  for (const k of Object.keys(freq)) {
    if (freq[k] > best) {
      best = freq[k]
      body = Number(k)
    }
  }
  const seen = new Set()
  const out = []
  for (const l of allLines) {
    const t = l.text
    if (t.length < 3 || t.length > 200 || seen.has(t.toLowerCase())) continue
    const caps = t.length > 3 && /[A-Z]/.test(t) && t === t.toUpperCase()
    const head =
      (body > 0 && l.size >= body * 1.15) ||
      l.bold ||
      caps ||
      HEAD_PATTERN.test(t) ||
      NUM_PATTERN.test(t)
    if (head) {
      seen.add(t.toLowerCase())
      out.push(t)
      if (out.length >= 200) break
    }
  }
  return out
}

// Returns { mode: 'text', text, pagesUsed, totalPages }
// or { mode: 'images', images, totalPages }
// or throws { code, ... }.
// opts: { onProgress(page, total), cancelled: { current: false } }
export async function readOutline(file, opts = {}) {
  const cap = deviceCap()
  if (!(await isPdf(file))) throw { code: 'not-pdf' }
  if (file.size > cap.bytes) throw { code: 'too-big', cap }

  let lib
  try {
    lib = await getPdfJs()
  } catch {
    throw { code: 'cdn' }
  }

  let pdf
  try {
    const buf = await file.arrayBuffer()
    pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) {
      throw { code: 'locked' }
    }
    throw { code: 'empty' }
  }

  try {
    const totalPages = pdf.numPages
    const limit = Math.min(totalPages, cap.pages)
    const allLines = []
    let header = []
    let pagesRead = 0
    for (let p = 1; p <= limit; p++) {
      if (opts.cancelled?.current) throw { code: 'cancelled' }
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      const lines = groupLines(content.items)
      if (p === 1) header = lines.slice(0, 8).map((l) => l.text)
      allLines.push(...lines)
      if (typeof page.cleanup === 'function') page.cleanup()
      pagesRead = p
      opts.onProgress?.(p, totalPages)
    }

    const headings = sieve(allLines)
    if (headings.length >= 3) {
      const text = `HEADER:\n${header.join('\n')}\nHEADINGS:\n${headings.map((h) => `- ${h}`).join('\n')}`.slice(0, MAX_TEXT)
      return { mode: 'text', text, pagesUsed: pagesRead, totalPages }
    }

    // Likely scanned: render up to 3 pages as compressed images.
    const images = []
    for (let p = 1; p <= Math.min(totalPages, 3); p++) {
      if (opts.cancelled?.current) throw { code: 'cancelled' }
      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale: 1 })
      const scale = Math.min(1.5, 768 / viewport.width)
      const v = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(v.width)
      canvas.height = Math.floor(v.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise
      images.push(canvas.toDataURL('image/jpeg', 0.7))
      canvas.width = 0
      if (typeof page.cleanup === 'function') page.cleanup()
    }
    if (images.length === 0) throw { code: 'empty' }
    return { mode: 'images', images, totalPages }
  } finally {
    try {
      await pdf.destroy()
    } catch {
      /* already gone */
    }
  }
}
