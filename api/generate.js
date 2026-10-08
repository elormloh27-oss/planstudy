// Vercel serverless function. Holds the Gemini key server-side.
// Frontend calls POST /api/generate, never Gemini directly.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'missing key' })

  const { subject, topics, deadline, hoursPerDay } = req.body || {}
  if (!subject || !topics || !deadline) {
    return res.status(400).json({ error: 'subject, topics and deadline required' })
  }

  const prompt =
    `Build a day-by-day study plan. Subject: ${String(subject).slice(0, 100)}. ` +
    `Topics: ${String(topics).slice(0, 1000)}. Deadline: ${deadline}. ` +
    `Hours per day: ${hoursPerDay}. Return ONLY a JSON array, no other text. ` +
    `Each item: {"id":"unique","title":"...","date":"YYYY-MM-DD","duration_min":30,"done":false}.`

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    )
    if (!r.ok) throw new Error('gemini ' + r.status)
    const data = await r.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('no json')
    const tasks = JSON.parse(match[0]).map((t, i) => ({
      id: String(t.id || `ai-${i}`),
      title: String(t.title || 'Study task'),
      date: String(t.date || deadline),
      duration_min: Number(t.duration_min || 30),
      done: false
    }))
    return res.status(200).json({ tasks, source: 'ai' })
  } catch (e) {
    return res.status(500).json({ error: 'ai failed' })
  }
}
