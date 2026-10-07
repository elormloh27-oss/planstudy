import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

export default function Navbar() {
  const [email, setEmail] = useState(null)
  const navigate = useNavigate()

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
    navigate('/')
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center">
          <img src="/planstudy-logo.svg" alt="PlanStudy" className="hidden h-8 w-auto sm:block" />
          <img src="/planstudy-mark.svg" alt="PlanStudy" className="h-7 w-7 sm:hidden" />
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {email ? (
            <>
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link
                to="/new"
                className="whitespace-nowrap rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              >
                New plan
              </Link>
              <button onClick={logout} className="text-slate-500 hover:text-slate-800">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-slate-900">
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
