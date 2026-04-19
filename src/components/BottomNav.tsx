import React from 'react'
import { Home, ListChecks, Landmark, BarChart2, MoreHorizontal } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/operations', label: 'Opérations', icon: ListChecks },
  { path: '/vue', label: 'Vue', icon: BarChart2 },
  { path: '/patrimoine', label: 'Patrimoine', icon: Landmark },
  { path: '/plus', label: 'Plus', icon: MoreHorizontal },
]

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Secondary pages that belong to the "Plus" tab
  const PLUS_ROUTES = ['/comptes', '/transactions', '/export', '/parametres', '/profil', '/questionnaire', '/liberte2', '/trajectoire', '/objectifs', '/historique', '/plan', '/analyse']

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/plus') return location.pathname === '/plus' || PLUS_ROUTES.some(r => location.pathname.startsWith(r))
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/80 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <button key={path} onClick={() => navigate(path)}
              className={cn('flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors min-w-[56px]', active ? 'text-primary' : 'text-muted-foreground')}>
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
