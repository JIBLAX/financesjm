import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassButton } from '../components/GlassButton'
import logoBeactiv from '../assets/logo-beactiv.png'

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>
  onSignUp: (email: string, password: string) => Promise<{ error: any }>
}

export const LoginPage: React.FC<Props> = ({ onSignIn, onSignUp }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Remplis tous les champs.')
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const { error: err } = mode === 'login'
        ? await onSignIn(email.trim(), password)
        : await onSignUp(email.trim(), password)

      if (err) {
        if (err.message?.includes('Invalid login')) setError('Email ou mot de passe incorrect.')
        else if (err.message?.includes('already registered')) setError('Email déjà utilisé. Connecte-toi.')
        else setError(err.message ?? 'Erreur inconnue.')
      } else if (mode === 'register') {
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container pt-10 items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center"
      >
        <img src={logoBeactiv} alt="Be Activ" className="h-16 mb-4 object-contain" />

        <h1 className="text-2xl font-black text-foreground mb-1">BE ACTIV TIMER</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {mode === 'login' ? 'Connecte-toi pour synchroniser tes données.' : 'Crée ton compte coach.'}
        </p>

        <div className="glass-card w-full p-5 flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full h-11 rounded-xl px-4 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/30"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full h-11 rounded-xl px-4 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/30"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <p className="text-xs text-destructive text-center px-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-center px-2" style={{ color: '#4ADE80' }}>{success}</p>
          )}

          <GlassButton
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </GlassButton>
        </div>

        <button
          className="mt-5 text-sm text-muted-foreground"
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); setSuccess(null) }}
        >
          {mode === 'login'
            ? 'Pas encore de compte ? Créer un compte →'
            : '← Déjà un compte ? Se connecter'}
        </button>
      </motion.div>
    </div>
  )
}
