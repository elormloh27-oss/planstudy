import { generateFallbackPlan, generateFallbackBreakdown } from './fallbackGenerator.js'

// Tries the server AI proxy first, falls back to offline builder.
// Both return the same task array shape.
export async function generatePlan(input) {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('proxy failed')
    const data = await res.json()
    if (Array.isArray(data.tasks) && data.tasks.length > 0) return { tasks: data.tasks, source: 'ai' }
    throw new Error('bad ai shape')
  } catch {
    return { tasks: generateFallbackPlan(input), source: 'offline' }
  }
}

// Forces part minutes to sum exactly to the task total, whatever the AI returns.
function normalizeParts(parts, total) {
  const clean = (Array.isArray(parts) ? parts : [])
    .map((p, i) => ({
      id: String(p.id || `bd-${i}`),
      title: String(p.title || 'Study part'),
      minutes: Math.max(1, Math.round(Number(p.minutes) || 10)),
      kind: ['learn', 'retrieve', 'review'].includes(String(p.kind || '').toLowerCase())
        ? String(p.kind).toLowerCase()
        : 'learn'
    }))
    .slice(0, 8)
  if (clean.length === 0) return clean
  const sum = clean.reduce((a, p) => a + p.minutes, 0)
  if (sum === total) return clean
  const scaled = clean.map((p) => Math.max(1, Math.round((p.minutes / sum) * total)))
  scaled[scaled.length - 1] += total - scaled.reduce((a, m) => a + m, 0)
  return clean.map((p, i) => ({ ...p, minutes: Math.max(1, scaled[i]) }))
}

// Splits one task into timed subtopics. AI first, offline splitter on failure.
export async function generateBreakdown(input) {
  const total = Math.max(5, Math.min(Math.round(Number(input.minutes) || 25), 300))
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'breakdown', ...input, minutes: total })
    })
    if (!res.ok) throw new Error('proxy failed')
    const data = await res.json()
    if (Array.isArray(data.parts) && data.parts.length > 0) {
      return { parts: normalizeParts(data.parts, total), source: 'ai' }
    }
    throw new Error('bad ai shape')
  } catch {
    return { parts: normalizeParts(generateFallbackBreakdown({ ...input, minutes: total }), total), source: 'offline' }
  }
}
