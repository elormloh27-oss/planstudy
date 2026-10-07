import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ProgressBar from '../components/ProgressBar.jsx'

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

  if (!plan) return <p className="mx-auto max-w-2xl px-4 py-10">Loading...</p>
  const tasks = plan.plan_json || []
  const done = tasks.filter((t) => t.done).length

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{plan.subject}</h1>
      <p className="text-sm text-slate-500">Due {plan.deadline} · {plan.hours_per_day}h/day</p>
      <div className="mt-4">
        <ProgressBar done={done} total={tasks.length} />
      </div>
      <ul className="mt-6 space-y-2">
        {tasks.map((t, i) => (
          <li key={t.id || i} className="flex items-center gap-3 rounded border bg-white px-4 py-3">
            <input type="checkbox" checked={Boolean(t.done)} onChange={() => toggle(i)} />
            <span className={t.done ? 'line-through text-slate-400' : ''}>{t.title}</span>
            <span className="ml-auto text-xs text-slate-500">{t.date} · {t.duration_min}m</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
