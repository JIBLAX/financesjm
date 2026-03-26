import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (val: number) => void
  label?: string
  unit?: string
}

export const GlassStepper: React.FC<Props> = ({ value, min = 0, max = 999, step = 1, onChange, label, unit = '' }) => {
  const dec = () => { if (value - step >= min) onChange(value - step) }
  const inc = () => { if (value + step <= max) onChange(value + step) }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">{label}</span>
      )}
      <div className="glass-card flex items-center justify-between gap-4 p-3">
        <motion.button
          onClick={dec}
          disabled={value <= min}
          whileTap={value > min ? { scale: 0.85 } : undefined}
          className="w-11 h-11 rounded-xl glass-btn flex items-center justify-center text-xl font-bold text-foreground/80 disabled:text-foreground/20 disabled:cursor-not-allowed"
        >
          −
        </motion.button>
        <div className="flex-1 text-center">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block text-2xl font-extrabold text-foreground tracking-tight"
          >
            {value}
          </motion.span>
          {unit && <span className="text-sm font-medium text-foreground/40 ml-1">{unit}</span>}
        </div>
        <motion.button
          onClick={inc}
          disabled={value >= max}
          whileTap={value < max ? { scale: 0.85 } : undefined}
          className="w-11 h-11 rounded-xl glass-btn flex items-center justify-center text-xl font-bold text-foreground/80 disabled:text-foreground/20 disabled:cursor-not-allowed"
        >
          +
        </motion.button>
      </div>
    </div>
  )
}
