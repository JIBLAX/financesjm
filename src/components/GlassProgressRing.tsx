import React from 'react'
import { motion } from 'framer-motion'
import type { TimerPhase } from '../types'

interface Props {
  size?: number
  progress: number
  phase: TimerPhase
  strokeWidth?: number
  children?: React.ReactNode
}

const phaseColors: Record<TimerPhase, string> = {
  idle: 'rgba(255,255,255,0.1)',
  preparation: '#818CF8',
  work: '#4ADE80',
  rest: '#FB923C',
  round_rest: '#D4B896',
  finished: '#4ADE80',
}

export const GlassProgressRing: React.FC<Props> = ({ size = 280, progress, phase, strokeWidth = 8, children }) => {
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))
  const color = phaseColors[phase]

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* Glass backdrop */}
      <div
        className="absolute rounded-full"
        style={{
          width: size - 20,
          height: size - 20,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />

      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {/* Progress */}
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>

      {/* Content inside ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
