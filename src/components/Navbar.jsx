import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

export default function Navbar() {
  const [email, setEmail] = useState(null)
  const [open, setOpen] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const navigate = useNavigate()

  function setMenu(v) {
    if (v) {
      setOpen(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setMenuVisible(true)))
    } else {
      setMenuVisible(false)
      setTimeout(() => setOpen(false), 200)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setMenu(false)
    navigate('/')
  }

  const links = email
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/new', label: 'New plan', pill: true }
      ]
    : [
        { to: '/login', label: 'Login' },
        { to: '/signup', label: 'Start free', pill: true }
      ]

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <nav className="mx-auto flex w-full items-center justify-between rounded-full bg-white/70 py-2 pl-4 pr-2 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-2xl sm:w-max sm:min-w-[560px]">
          <Link to="/" className="flex shrink-0 items-center" onClick={() => setMenu(false)}>
            <img src="/planstudy-logo.svg" alt="PlanStudy" className="h-7 w-auto" />
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {links.map((l) =>
              l.pill ? (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group flex items-center gap-2 rounded-full bg-indigo-600 py-2 pl-5 pr-2 text-sm font-semibold text-white transition-all duration-300 ease-spring active:scale-[0.98]"
                >
                  {l.label}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:scale-105">
                    <ArrowUpRight size={15} />
                  </span>
                </Link>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-300 hover:bg-slate-900/5 hover:text-slate-900"
                >
                  {l.label}
                </Link>
              )
            )}
            {email && (
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors duration-300 hover:text-slate-800"
              >
                Logout
              </button>
            )}
          </div>
          <button
            onClick={() => setMenu(!open)}
            aria-label="Menu"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 sm:hidden"
          >
            <span
              className={`absolute h-0.5 w-5 rounded bg-slate-800 transition-all duration-300 ease-spring ${
                open ? 'rotate-45' : '-translate-y-1'
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded bg-slate-800 transition-all duration-300 ease-spring ${
                open ? '-rotate-45' : 'translate-y-1'
              }`}
            />
          </button>
        </nav>
      </div>

      {open && (
        <div
          onClick={() => setMenu(false)}
          className={`fixed inset-0 z-40 bg-white/80 backdrop-blur-3xl transition-opacity duration-200 ease-spring sm:hidden ${
            menuVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => setMenu(false)}
            aria-label="Close menu"
            className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/5"
          >
            <X size={20} />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full flex-col items-center justify-center gap-2 px-8"
          >
            {links.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenu(false)}
                style={{ transitionDelay: `${100 + i * 70}ms` }}
                className="reveal reveal-in w-full rounded-3xl bg-white py-4 text-center text-2xl font-bold shadow-[0_24px_48px_-24px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/5 transition-all duration-500 ease-spring"
              >
                {l.label}
              </Link>
            ))}
            {email && (
              <button
                onClick={logout}
                style={{ transitionDelay: '260ms' }}
                className="reveal reveal-in mt-2 text-lg font-medium text-slate-500 transition-all duration-500 ease-spring"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
