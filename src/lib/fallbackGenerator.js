// Offline plan builder. Same task shape as the AI proxy returns,
// so the UI never cares which one produced the plan.
export function generateFallbackPlan({ subject, topics, deadline, hoursPerDay }) {
  const names = String(topics)
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const list = names.length > 0 ? names : [String(subject || 'Study')]

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(deadline)
  const days = Math.max(1, Math.round((end - today) / 86400000) + 1)
  const perDayMinutes = Math.max(30, Math.round((hoursPerDay || 2) * 60))
  const slice = Math.max(1, Math.ceil(list.length / days))

  const tasks = []
  for (let d = 0; d < days; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    const iso = date.toISOString().slice(0, 10)
    const chunk = list.slice(d * slice, d * slice + slice)
    if (chunk.length === 0) {
      tasks.push({
        id: `${iso}-review`,
        title: `Review day ${d + 1}`,
        date: iso,
        duration_min: Math.min(30, perDayMinutes),
        done: false
      })
    } else {
      const each = Math.max(15, Math.round(perDayMinutes / chunk.length))
      chunk.forEach((name, k) => {
        tasks.push({
          id: `${iso}-${k}`,
          title: `Study ${name}`,
          date: iso,
          duration_min: each,
          done: false
        })
      })
    }
  }
  return tasks
}

// Offline session splitter. Same shape as the AI breakdown, totals enforced by caller.
export function generateFallbackBreakdown({ topicTitle, minutes }) {
  const total = Math.max(5, Math.min(Math.round(Number(minutes) || 25), 300))
  const name = String(topicTitle || 'Study').replace(/^Study\s+/i, '') || 'Study'
  const recall = Math.max(5, Math.round(total / 5))
  const learn = total - recall
  const n = Math.max(1, Math.ceil(learn / 25))
  const base = Math.floor(learn / n)
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({
      id: `off-bd-${i}`,
      title: `${name} — part ${i + 1}`,
      minutes: base + (i < learn - base * n ? 1 : 0),
      kind: 'learn'
    })
  }
  out.push({ id: 'off-bd-r', title: `Recall everything from ${name}`, minutes: recall, kind: 'retrieve' })
  return out
}
