import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState('checking')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? 'in' : 'out')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? 'in' : 'out')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (state === 'checking') {
    return <p className="mx-auto max-w-6xl px-4 py-10 text-slate-500">Loading...</p>
  }
  if (state === 'out') return <Navigate to="/login" replace />
  return children
}
