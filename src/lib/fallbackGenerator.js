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
