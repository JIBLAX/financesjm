import React from 'react'
import { motion } from 'framer-motion'

type Variant = 'primary' | 'ghost' | 'glass' | 'danger'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
  ghost: 'glass-btn text-foreground/70',
  glass: 'glass-btn text-foreground',
  danger: 'bg-destructive/20 border border-destructive/30 text-destructive',
}

export const GlassButton: React.FC<Props> = ({ variant = 'primary', fullWidth = false, children, className = '', disabled, ...rest }) => {
  return (
    <motion.button
      className={`inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-2xl text-base font-semibold tracking-wide select-none ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      transition={{ duration: 0.15 }}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  )
}
