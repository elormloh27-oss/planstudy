import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
        <h1 className="text-2xl font-bold">Your study plans</h1>
        <Link to="/new" className="rounded bg-indigo-600 px-4 py-2 text-white">
          New plan
        </Link>
      </div>
      {plans.length === 0 ? (
        <div className="mt-8 rounded border bg-white p-10 text-center">
          <p className="text-slate-600">No plans yet. Make your first one.</p>
          <Link to="/new" className="mt-4 inline-block rounded bg-indigo-600 px-4 py-2 text-white">
            Create a plan
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
                className="anim-fade-up rounded border bg-white p-5"
                style={{ animationDelay: `${Math.min(i, 6) * 0.06}s` }}
              >
                <p className="font-semibold">{plan.subject}</p>
                <p className="text-sm text-slate-500">Due {plan.deadline}</p>
                <div className="mt-3">
                  <ProgressBar done={done} total={tasks.length} />
                </div>
                <div className="mt-4 flex gap-3 text-sm">
                  <Link to={`/plan/${plan.id}`} className="text-indigo-600">
                    Open
                  </Link>
                  <button onClick={() => remove(plan.id)} className="text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
