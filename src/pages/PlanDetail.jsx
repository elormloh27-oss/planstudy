import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ProgressBar from '../components/ProgressBar.jsx'
import Loading from '../components/Loading.jsx'

export default function PlanDetail() {
  const { id } = useParams()
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    supabase
      .from('study_plans')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setPlan(data))
  }, [id])

  async function toggle(index) {
    const tasks = (plan.plan_json || []).map((t, i) =>
      i === index ? { ...t, done: !t.done } : t
    )
    setPlan({ ...plan, plan_json: tasks })
    await supabase.from('study_plans').update({ plan_json: tasks }).eq('id', id)
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
          <li key={t.id || i} className="anim-fade-up flex items-center gap-3 rounded border bg-white px-4 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
            <input
              key={String(Boolean(t.done))}
              type="checkbox"
              checked={Boolean(t.done)}
              onChange={() => toggle(i)}
              className={`h-5 w-5 accent-indigo-600 ${t.done ? 'anim-pop' : ''}`}
            />
            <span className={t.done ? 'line-through text-slate-400' : ''}>{t.title}</span>
            <span className="ml-auto text-xs text-slate-500">{t.date} · {t.duration_min}m</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
