import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface Props {
  onAuth: (userId: string) => void
}

export const AuthPage: React.FC<Props> = ({ onAuth }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        if (data.user) onAuth(data.user.id)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); return }
        if (data.user && !data.session) {
          setMessage('Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
          setMode('signin')
        } else if (data.user) {
          onAuth(data.user.id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-foreground">Finances JM</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Connecte-toi pour accéder à tes finances' : 'Crée ton compte'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl space-y-4">

          {/* Mode tabs */}
          <div className="flex bg-muted/40 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); setMessage('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setMessage('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoComplete="email"
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-xs text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-opacity mt-1"
            >
              {loading ? '...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          Tes données sont chiffrées et synchronisées entre tes appareils.
        </p>
      </div>
    </div>
  )
}
