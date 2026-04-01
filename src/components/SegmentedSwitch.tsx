import React from 'react'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  key: T
  label: string
  icon?: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export function SegmentedSwitch<T extends string>({ options, value, onChange, className }: Props<T>) {
  const idx = Math.max(0, options.findIndex(o => o.key === value))
  const n = options.length

  return (
    <div className={cn('relative flex bg-muted/30 rounded-2xl p-1', className)}>
      {/* Sliding pill */}
      <div
        className="absolute rounded-xl bg-card border border-border/60 shadow-md transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          top: 4,
          bottom: 4,
          left: `calc(4px + ${idx} * (100% - 8px) / ${n})`,
          width: `calc((100% - 8px) / ${n})`,
        }}
      />
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'relative z-10 flex-1 py-2.5 text-xs font-semibold text-center transition-colors duration-150 flex items-center justify-center gap-1.5',
            value === opt.key ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {opt.icon && <span className="text-sm">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
