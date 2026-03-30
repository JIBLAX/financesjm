import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Delete } from 'lucide-react'

interface Props {
  correctPin: string
  pinConfigured: boolean
  onUnlock: () => void
  onSetupPin: (pin: string) => void
}

export const PinLock: React.FC<Props> = ({ correctPin, pinConfigured, onUnlock, onSetupPin }) => {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'setup' | 'confirm'>(pinConfigured ? 'enter' : 'setup')
  const [error, setError] = useState('')

  const maxLen = 4

  const handleDigit = (d: string) => {
    setError('')
    const current = step === 'confirm' ? confirmPin : pin
    if (current.length >= maxLen) return

    const next = current + d

    if (step === 'confirm') {
      setConfirmPin(next)
      if (next.length === maxLen) {
        if (next === pin) {
          onSetupPin(next)
          onUnlock()
        } else {
          setError('Les PIN ne correspondent pas')
          setConfirmPin('')
        }
      }
    } else if (step === 'setup') {
      setPin(next)
      if (next.length === maxLen) {
        setStep('confirm')
      }
    } else {
      setPin(next)
      if (next.length === maxLen) {
        if (next === correctPin) {
          onUnlock()
        } else {
          setError('PIN incorrect')
          setPin('')
        }
      }
    }
  }

  const handleDelete = () => {
    setError('')
    if (step === 'confirm') {
      setConfirmPin(p => p.slice(0, -1))
    } else {
      setPin(p => p.slice(0, -1))
    }
  }

  const currentPin = step === 'confirm' ? confirmPin : pin
  const title = step === 'setup' ? 'Créer votre PIN' : step === 'confirm' ? 'Confirmer le PIN' : 'Déverrouiller'
  const subtitle = step === 'setup' ? 'Choisissez un code à 4 chiffres' : step === 'confirm' ? 'Ressaisissez votre code' : 'Entrez votre code PIN'

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-background px-6 py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-8 w-full max-w-xs"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-4">
          {Array.from({ length: maxLen }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < currentPin.length
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/30'
              }`}
              animate={i < currentPin.length ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-sm font-medium"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((k, i) => (
            <div key={i}>
              {k === '' ? (
                <div />
              ) : k === 'del' ? (
                <button
                  onClick={handleDelete}
                  className="w-full h-16 rounded-2xl flex items-center justify-center text-muted-foreground active:bg-muted/50 transition-colors"
                >
                  <Delete className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => handleDigit(k)}
                  className="w-full h-16 rounded-2xl text-2xl font-semibold text-foreground active:bg-primary/20 transition-colors hover:bg-muted/30"
                >
                  {k}
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
