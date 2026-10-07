import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

export default function Landing() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session))
    })
  }, [])

  return (
    <main>
      <section className="anim-fade-up mx-auto max-w-6xl px-4 py-16 text-center">
        <img src="/planstudy-logo.svg" alt="PlanStudy" className="anim-bounce-soft mx-auto h-20 w-auto" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          AI study plans for students.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Enter your subject, topics, deadline and study hours. PlanStudy builds
          a day-by-day plan you can track to the finish.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to={loggedIn ? '/dashboard' : '/signup'}
            className="rounded bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700"
          >
            Start free
          </Link>
          <Link
            to={loggedIn ? '/dashboard' : '/login'}
            className="rounded border px-5 py-2.5 hover:bg-slate-100"
          >
            {loggedIn ? 'Open dashboard' : 'Log in'}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 md:grid-cols-3">
        <div className="rounded border bg-white p-5">
          <p className="font-semibold">1. Tell us your subjects</p>
          <p className="mt-1 text-sm text-slate-600">
            Subject, topics, exam date and hours per day.
          </p>
        </div>
        <div className="rounded border bg-white p-5">
          <p className="font-semibold">2. AI builds your plan</p>
          <p className="mt-1 text-sm text-slate-600">
            A structured task list spread across your free days.
          </p>
        </div>
        <div className="rounded border bg-white p-5">
          <p className="font-semibold">3. Track progress</p>
          <p className="mt-1 text-sm text-slate-600">
            Check off tasks and watch your completion grow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded bg-indigo-600 p-8 text-center text-white">
          <img src="/planstudy-logo-white.svg" alt="PlanStudy" className="mx-auto h-12 w-auto" />
          <p className="mt-4 text-xl font-semibold">Ready to plan your next exam?</p>
          <Link
            to={loggedIn ? '/dashboard' : '/signup'}
            className="mt-4 inline-block rounded bg-white px-5 py-2.5 text-indigo-700"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  )
}
