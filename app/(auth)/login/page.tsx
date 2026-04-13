'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.push('/workspace')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
            <span className="text-white font-extrabold text-base">OF</span>
          </div>
          <div>
            <div className="text-lg font-bold text-text tracking-tight">Optia Feed</div>
            <div className="text-2xs text-text-ghost font-medium uppercase tracking-widest">by Agrometrics</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h1 className="text-xl font-bold text-text mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-text-faint mb-6">
            {mode === 'login'
              ? 'Sign in to your nutrition platform'
              : 'Start formulating smarter diets'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={6}
            />

            {error && (
              <p className="text-sm text-status-red bg-status-red/10 rounded px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center mt-1"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-brand hover:underline bg-transparent border-none cursor-pointer"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-2xs text-text-ghost text-center mt-6">
          Livestock nutrition, intelligently formulated
        </p>
      </div>
    </div>
  )
}
