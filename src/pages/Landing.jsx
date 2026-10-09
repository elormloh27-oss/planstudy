import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'
import useRevealRoot from '../lib/useRevealRoot.js'

const STEPS = [
  { title: 'Tell us your subjects', body: 'Subject, topics, exam date, hours per day. Two minutes, once.' },
  { title: 'AI builds your plan', body: 'A day-by-day task list spread across your free days.' },
  { title: 'Check off and finish', body: 'Focus timer, progress rings, and a plan that survives reloads.' }
]

export default function Landing() {
  const [loggedIn, setLoggedIn] = useState(false)
  const rootRef = useRevealRoot()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session))
    })
  }, [])

  return (
    <main ref={rootRef}>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:pt-20">
        <div>
          <span className="eyebrow bg-indigo-50 text-indigo-700">AI study planner</span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Exam season, handled.
          </h1>
          <p className="mt-4 max-w-[45ch] text-base leading-relaxed text-slate-600">
            Turn subjects and deadlines into a day-by-day plan you can actually finish.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={loggedIn ? '/dashboard' : '/signup'}
              className="group flex items-center gap-2 rounded-full bg-indigo-600 py-3 pl-6 pr-2 font-semibold text-white transition-all duration-300 ease-spring active:scale-[0.98]"
            >
              Start free
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
                <ArrowRight size={16} />
              </span>
            </Link>
            {!loggedIn && (
              <Link
                to="/login"
                className="rounded-full px-6 py-3 font-semibold text-slate-700 transition-colors duration-300 hover:bg-slate-900/5"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        <div className="bezel">
          <div className="bezel-inner p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold">Biology · 68%</p>
              <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles size={12} /> AI plan
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 rounded-full bg-indigo-600" />
            </div>
            <ul className="mt-4 space-y-2">
              {['Cell structure · 25m', 'Photosynthesis · 50m', 'Genetics basics · 30m'].map((t, i) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      i === 0 ? 'bg-green-500 text-white' : 'bg-white text-transparent ring-1 ring-slate-200'
                    }`}
                  >
                    <Check size={14} />
                  </span>
                  <span className={i === 0 ? 'text-slate-400 line-through' : 'font-medium'}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="reveal-soft text-2xl font-bold tracking-tight md:text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="reveal-soft bezel md:col-span-3">
            <div className="bezel-inner p-6">
              <p className="text-5xl font-bold text-indigo-600">1</p>
              <p className="mt-2 text-xl font-bold">{STEPS[0].title}</p>
              <p className="mt-1 max-w-[45ch] text-slate-600">{STEPS[0].body}</p>
            </div>
          </div>
          <div className="grid gap-4 md:col-span-2">
            {STEPS.slice(1).map((s, i) => (
              <div key={s.title} className="reveal-soft bezel" style={{ transitionDelay: `${(i + 1) * 90}ms` }}>
                <div className="bezel-inner p-5">
                  <p className="text-3xl font-bold text-indigo-600">{i + 2}</p>
                  <p className="mt-1 font-bold">{s.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="reveal rounded-[2rem] bg-indigo-600 p-8 text-center text-white shadow-[0_32px_64px_-32px_rgba(79,70,229,0.5)] md:p-12">
          <img src="/planstudy-logo-white.svg" alt="PlanStudy" className="mx-auto h-12 w-auto" />
          <p className="mx-auto mt-4 max-w-[30ch] text-2xl font-bold tracking-tight">
            Ready to plan your next exam?
          </p>
          <Link
            to={loggedIn ? '/dashboard' : '/signup'}
            className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-semibold text-indigo-700 transition-transform duration-300 ease-spring active:scale-[0.98]"
          >
            Start free
          </Link>
        </div>
      </section>
    </main>
  )
}
