import React from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const FinanceCard: React.FC<Props> = ({ children, className, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      'rounded-2xl bg-card border border-border/50 p-4 transition-all',
      onClick && 'cursor-pointer active:scale-[0.98] hover:border-border',
      className
    )}
  >
    {children}
  </div>
)
