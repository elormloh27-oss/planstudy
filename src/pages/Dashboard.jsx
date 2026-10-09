import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, CalendarDays, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'
import ProgressBar from '../components/ProgressBar.jsx'
import Loading from '../components/Loading.jsx'

export default function Dashboard() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('study_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPlans(data || [])
        setLoading(false)
      })
  }, [])

  async function remove(id) {
    if (!confirm('Delete this plan?')) return
    await supabase.from('study_plans').delete().eq('id', id)
    setPlans((p) => p.filter((x) => x.id !== id))
  }

  if (loading) return <Loading message="Loading your plans..." />

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">Overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your study plans</h1>
        </div>
        <Link
          to="/new"
          className="btn-lively flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm"
        >
          <Plus size={18} /> New plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm">
          <BookOpenCheck size={40} className="mx-auto text-indigo-600" />
          <p className="mt-3 text-lg font-semibold">No plans yet</p>
          <p className="mt-1 text-slate-600">Make your first one in under a minute.</p>
          <Link
            to="/new"
            className="btn-lively mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white"
          >
            <Plus size={18} /> Create a plan
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {plans.map((plan, i) => {
            const tasks = plan.plan_json || []
            const done = tasks.filter((t) => t.done).length
            return (
              <div
                key={plan.id}
                className="anim-fade-up rounded-2xl border bg-white p-5 shadow-sm"
                style={{ animationDelay: `${Math.min(i, 6) * 0.06}s` }}
              >
                <p className="text-lg font-semibold">{plan.subject}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <CalendarDays size={14} /> Due {plan.deadline} · {done} of {tasks.length} done
                </p>
                <div className="mt-3">
                  <ProgressBar done={done} total={tasks.length} />
                </div>
                <div className="mt-4 flex justify-end gap-2 text-sm">
                  <button
                    onClick={() => remove(plan.id)}
                    className="btn-lively flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  <Link
                    to={`/plan/${plan.id}`}
                    className="btn-lively flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white"
                  >
                    Open <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
