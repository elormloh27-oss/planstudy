import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ProgressBar from '../components/ProgressBar.jsx'
import Loading from '../components/Loading.jsx'
import SessionTimer from '../components/SessionTimer.jsx'
import { generateBreakdown } from '../lib/generatePlan.js'

export default function PlanDetail() {
  const { id } = useParams()
  const [plan, setPlan] = useState(null)
  const [activeTimer, setActiveTimer] = useState(null)
  const [breaking, setBreaking] = useState(null)

  useEffect(() => {
    supabase
      .from('study_plans')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setPlan(data))
  }, [id])

  async function saveTasks(tasks) {
    setPlan({ ...plan, plan_json: tasks })
    await supabase.from('study_plans').update({ plan_json: tasks }).eq('id', id)
  }

  async function toggle(index) {
    const tasks = (plan.plan_json || []).map((t, i) => {
      if (i !== index) return t
      const next = { ...t, done: !t.done }
      if (!next.done) delete next.blocks_done
      return next
    })
    await saveTasks(tasks)
  }

  async function markBlock(index, blockNum) {
    const tasks = (plan.plan_json || []).map((t, i) =>
      i === index ? { ...t, blocks_done: blockNum + 1 } : t
    )
    await saveTasks(tasks)
  }

  async function breakDown(index) {
    const t = (plan.plan_json || [])[index]
    if (!t) return
    setBreaking(index)
    const res = await generateBreakdown({
      subject: plan.subject,
      topicTitle: t.title,
      minutes: t.duration_min
    })
    const tasks = (plan.plan_json || []).map((x, i) =>
      i === index ? { ...x, breakdown: res.parts, breakdownSource: res.source } : x
    )
    setBreaking(null)
    await saveTasks(tasks)
  }

  async function finishFromTimer(index) {
    const tasks = (plan.plan_json || []).map((t, i) =>
      i === index ? { ...t, done: true } : t
    )
    await saveTasks(tasks)
  }

  if (!plan) return <Loading message="Opening your plan..." />
  const tasks = plan.plan_json || []
  const done = tasks.filter((t) => t.done).length
  const complete = tasks.length > 0 && done === tasks.length

  return (
    <main className="anim-fade-up mx-auto max-w-2xl px-4 py-8">
      {complete && (
        <div className="relative mb-4 overflow-hidden rounded-2xl bg-indigo-600 p-5 text-center text-white">
          {['#FFFFFF', '#FDE68A', '#A5B4FC', '#6EE7B7', '#FCA5A5'].map((c, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{ left: `${8 + i * 18}%`, background: c, animationDelay: `${i * 0.15}s` }}
            />
          ))}
          <p className="anim-wiggle inline-block text-3xl">🎉</p>
          <p className="mt-1 text-lg font-bold">Plan complete. Exam ready.</p>
        </div>
      )}
      <h1 className="text-2xl font-bold">{plan.subject}</h1>
      <p className="text-sm text-slate-500">Due {plan.deadline} · {plan.hours_per_day}h/day</p>
      <div className="mt-4">
        <ProgressBar done={done} total={tasks.length} />
      </div>
      <ul className="mt-6 space-y-2">
        {tasks.map((t, i) => (
          <li key={t.id || i}>
            <div className="anim-fade-up flex items-center gap-3 rounded border bg-white px-4 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
              <input
                key={String(Boolean(t.done))}
                type="checkbox"
                checked={Boolean(t.done)}
                onChange={() => toggle(i)}
                className={`h-5 w-5 accent-indigo-600 ${t.done ? 'anim-pop' : ''}`}
              />
              <span className={t.done ? 'line-through text-slate-400' : ''}>{t.title}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">{t.date} · {t.duration_min}m</span>
            </div>
            {!t.done && (
              <button
                onClick={() => setActiveTimer(activeTimer === i ? null : i)}
                className="btn-lively mt-1 w-full rounded-xl border border-indigo-200 bg-white py-2 text-sm font-semibold text-indigo-600"
              >
                {activeTimer === i ? 'Hide timer' : 'Start focus session'}
              </button>
            )}
            {!t.done && (
              <button
                onClick={() => breakDown(i)}
                disabled={breaking === i}
                className="btn-lively mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                {breaking === i ? 'Breaking it down...' : t.breakdown ? 'Re-break down' : 'Break it down'}
              </button>
            )}
            {t.breakdown && (
              <div className="anim-fade-up mt-2 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Focus order · {t.breakdown.reduce((a, p) => a + p.minutes, 0)} min total
                  {t.breakdownSource === 'offline' ? ' · offline' : ''}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {t.breakdown.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          p.kind === 'retrieve'
                            ? 'bg-green-100 text-green-700'
                            : p.kind === 'review'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {p.kind}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                      <span className="shrink-0 text-xs text-slate-500">{p.minutes}m</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeTimer === i && !t.done && (
              <div className="anim-fade-up mt-2">
                <SessionTimer
                  key={`${t.id}-${t.blocks_done || 0}`}
                  task={t}
                  startBlock={t.blocks_done || 0}
                  onBlockDone={(b) => markBlock(i, b)}
                  onTaskDone={() => {
                    finishFromTimer(i)
                    setActiveTimer(null)
                  }}
                  onClose={() => setActiveTimer(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
