// Reads course-outline PDFs entirely in the browser.
// Text layer via pdf.js (lazy CDN, pinned version). Scanned pages become
// small JPEGs for Gemini vision. The PDF file itself never leaves the device.
const PDFJS_VERSION = '3.11.174'
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_PAGES = 30
export const MAX_TEXT = 15000

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

// Returns { mode: 'text', text, pagesUsed, totalPages }
// or { mode: 'images', images: [dataUrl...], totalPages }
// or throws { code } where code is 'not-pdf' | 'too-big' | 'locked' | 'empty' | 'cdn'
export async function readOutline(file) {
  if (!(await isPdf(file))) throw { code: 'not-pdf' }
  if (file.size > MAX_FILE_BYTES) throw { code: 'too-big' }

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

  const totalPages = pdf.numPages
  const usePages = Math.min(totalPages, MAX_PAGES)
  const texts = []
  const scanned = []
  for (let p = 1; p <= usePages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const str = content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim()
    texts.push(str)
    if (str.length < 30) scanned.push({ page, num: p })
    if (typeof page.cleanup === 'function') page.cleanup()
  }

  const text = texts.join('\n').slice(0, MAX_TEXT)
  if (text.replace(/\s/g, '').length >= 500) {
    return { mode: 'text', text, pagesUsed: usePages, totalPages }
  }

  // Scanned: render up to 3 empty pages as compressed images.
  const images = []
  for (const { page } of scanned.slice(0, 3)) {
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(1.5, 768 / viewport.width)
    const v = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(v.width)
    canvas.height = Math.floor(v.height)
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.7))
    if (typeof page.cleanup === 'function') page.cleanup()
  }
  if (images.length === 0) throw { code: 'empty' }
  return { mode: 'images', images, totalPages }
}
