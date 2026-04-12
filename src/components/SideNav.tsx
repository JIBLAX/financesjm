import React from 'react'
import { Home, ListChecks, BarChart2, Landmark, MoreHorizontal } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/operations', label: 'Opérations', icon: ListChecks },
  { path: '/vue', label: 'Vue', icon: BarChart2 },
  { path: '/patrimoine', label: 'Patrimoine', icon: Landmark },
  { path: '/plus', label: 'Plus', icon: MoreHorizontal },
]

export const SideNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-card/80 backdrop-blur-xl border-r border-border/50 z-40 py-6 px-3">
      <div className="px-3 pb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Finances JM</p>
        <div className="w-6 h-0.5 bg-primary/60 rounded-full mt-2" />
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <button key={path} onClick={() => navigate(path)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}>
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
