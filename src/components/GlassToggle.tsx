import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
}

export const GlassToggle: React.FC<Props> = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-[52px] h-[30px] rounded-full transition-colors duration-300"
        style={{
          background: checked ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)',
          boxShadow: checked ? '0 0 16px hsl(var(--primary) / 0.3)' : 'none',
        }}
      >
        <motion.div
          className="absolute top-[3px] w-6 h-6 rounded-full bg-foreground shadow-md"
          animate={{ left: checked ? '24px' : '3px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </label>
  )
}
