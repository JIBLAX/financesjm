import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, SlidersHorizontal, FileDown, Settings, PieChart, TrendingUp, User, Trophy, Rocket } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'

export const MorePage: React.FC = () => {
  const navigate = useNavigate()

  const items = [
    { label: 'Mois / Cashflow', desc: 'Revenus, dépenses, répartition mensuelle', icon: PieChart, path: '/mois', color: 'text-primary' },
    { label: 'Répartition', desc: 'Calculer la répartition mensuelle', icon: PieChart, path: '/repartition', color: 'text-primary' },
    { label: 'Patrimoine', desc: 'Actifs, dettes, patrimoine net', icon: TrendingUp, path: '/patrimoine', color: 'text-amber-400' },
    { label: 'Transactions', desc: 'Historique et saisie', icon: ArrowRightLeft, path: '/transactions', color: 'text-emerald-400' },
    { label: 'Dépenses', desc: 'Charges et abonnements', icon: SlidersHorizontal, path: '/depenses', color: 'text-amber-400' },
    { label: 'Profil', desc: 'Niveau, score santé, profil investisseur', icon: User, path: '/profil', color: 'text-blue-400' },
    { label: 'Liberté 2.0', desc: 'Road to 100 000 €', icon: Rocket, path: '/liberte2', color: 'text-primary' },
    { label: 'Liberté 3.0', desc: 'Road to 1 000 000 €', icon: Trophy, path: '/liberte3', color: 'text-amber-300' },
    { label: 'Export', desc: 'Sauvegarder vos données', icon: FileDown, path: '/export', color: 'text-blue-400' },
    { label: 'Paramètres', desc: 'PIN, thème, pourcentages', icon: Settings, path: '/parametres', color: 'text-muted-foreground' },
  ]

  return (
    <div className="page-container pt-6 pb-24 gap-3">
      <h1 className="text-xl font-bold text-foreground mb-2">Plus</h1>
      {items.map(item => (
        <FinanceCard key={item.path} onClick={() => navigate(item.path)}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        </FinanceCard>
      ))}
    </div>
  )
}
