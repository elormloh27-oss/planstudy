// Vercel serverless function. Holds the Gemini key server-side.
// Frontend calls POST /api/generate, never Gemini directly.
// Body: { action: 'plan' | 'breakdown', ...inputs }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'missing key' })

  const body = req.body || {}
  const action = body.action || 'plan'

  async function askGemini(prompt) {
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  function extractJson(text) {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('no json')
    return JSON.parse(match[0])
  }

  try {
    if (action === 'breakdown') {
      const { subject, topicTitle, minutes } = body
      const total = Math.max(5, Math.min(Number(minutes) || 25, 300))
      if (!topicTitle) return res.status(400).json({ error: 'topic required' })
      const prompt =
        `Split a ${total}-minute study session on "${String(topicTitle).slice(0, 200)}" ` +
        `(subject ${String(subject || '').slice(0, 100)}) into focused subtopics. Rules: ` +
        `minutes must sum to exactly ${total}. No chunk over 25 minutes. ` +
        `Harder parts get more minutes. The final chunk must be retrieval practice ` +
        `(self-test on the earlier chunks), about one fifth of the time. ` +
        `Return ONLY a JSON array, no other text. Each item: ` +
        `{"title":"...","minutes":20,"kind":"learn, retrieve or review"}.`
      const parts = extractJson(await askGemini(prompt)).map((p, i) => ({
        id: `bd-${Date.now()}-${i}`,
        title: String(p.title || 'Study part'),
        minutes: Math.max(1, Math.round(Number(p.minutes) || 10)),
        kind: ['learn', 'retrieve', 'review'].includes(String(p.kind).toLowerCase())
          ? String(p.kind).toLowerCase()
          : 'learn'
      }))
      return res.status(200).json({ parts, source: 'ai' })
    }

    const { subject, topics, deadline, hoursPerDay } = body
    if (!subject || !topics || !deadline) {
      return res.status(400).json({ error: 'subject, topics and deadline required' })
    }
    const prompt =
      `Build a day-by-day study plan. Subject: ${String(subject).slice(0, 100)}. ` +
      `Topics: ${String(topics).slice(0, 1000)}. Deadline: ${deadline}. ` +
      `Hours per day: ${hoursPerDay}. Return ONLY a JSON array, no other text. ` +
      `Each item: {"id":"unique","title":"...","date":"YYYY-MM-DD","duration_min":30,"done":false}.`
    const tasks = extractJson(await askGemini(prompt)).map((t, i) => ({
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
