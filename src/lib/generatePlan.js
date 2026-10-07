import { generateFallbackPlan } from './fallbackGenerator.js'

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
