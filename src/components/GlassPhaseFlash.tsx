import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TimerPhase } from '../types'

const phaseColors: Partial<Record<TimerPhase, string>> = {
  preparation: 'rgba(129,140,248,0.2)',
  work: 'rgba(74,222,128,0.15)',
  rest: 'rgba(251,146,60,0.15)',
  round_rest: 'rgba(212,184,150,0.12)',
  finished: 'rgba(74,222,128,0.15)',
}

export const GlassPhaseFlash: React.FC<{ phase: TimerPhase | null }> = ({ phase }) => {
  const [visible, setVisible] = useState(false)
  const [color, setColor] = useState('transparent')

  useEffect(() => {
    if (phase && phaseColors[phase]) {
      setColor(phaseColors[phase]!)
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
  }, [phase])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 pointer-events-none z-[9999]"
          style={{ background: color, backdropFilter: 'blur(8px)' }}
        />
      )}
    </AnimatePresence>
  )
}
