'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const isWelcome = searchParams?.get('welcome') === 'true'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
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
          <svg viewBox="0 0 128 128" width={44} height={44} xmlns="http://www.w3.org/2000/svg">
            <rect width="128" height="128" rx="24" fill="#BE5529"/>
            <polygon points="64,18 106,40 106,88 64,110 22,88 22,40" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinejoin="round"/>
            <line x1="64" y1="38" x2="44" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
            <line x1="64" y1="38" x2="84" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
            <line x1="44" y1="78" x2="84" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
            <circle cx="64" cy="38" r="5.5" fill="#fff"/>
            <circle cx="44" cy="78" r="5.5" fill="#fff"/>
            <circle cx="84" cy="78" r="5.5" fill="#fff"/>
            <circle cx="64" cy="64" r="3" fill="rgba(255,255,255,0.6)"/>
          </svg>
          <div>
            <div className="text-lg font-bold tracking-tight">
              <span className="text-text">Optia</span>
              <span className="text-brand ml-0.5">Feed</span>
            </div>
            <div className="text-2xs text-text-faint font-medium uppercase tracking-widest">by Agrometrics</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          {isWelcome && (
            <div className="bg-[#2E6B42]/15 border border-[#2E6B42]/30 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-[#5dca7a]">Account created!</p>
              <p className="text-xs text-[#5dca7a]/80 mt-0.5">Your 24-hour trial is active. Sign in with the password you just created.</p>
            </div>
          )}

          <h1 className="text-xl font-bold text-text mb-1">
            {isWelcome ? 'Sign in to get started' : 'Welcome back'}
          </h1>
          <p className="text-sm text-text-faint mb-6">
            {isWelcome
              ? 'Use the email and password from your signup'
              : 'Sign in to your nutrition platform'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input" required
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input" required minLength={6}
            />
            {error && (
              <p className="text-sm text-status-red bg-status-red/10 rounded px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="https://optiafeed.cloud/#trial"
              className="text-sm text-brand hover:underline"
            >
              Don&apos;t have an account? Start free trial
            </a>
          </div>
        </div>

        <p className="text-2xs text-text-faint text-center mt-6">
          AI-powered, field-proven
        </p>
      </div>
    </div>
  )
}
