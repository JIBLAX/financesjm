import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, Settings, Map, User, Wallet, Gift, History, ArrowLeftRight, Receipt } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'

export const MorePage: React.FC = () => {
  const navigate = useNavigate()

  const items = [
    { label: 'Transactions', desc: 'Revenus, dépenses et transferts enregistrés', icon: Receipt, path: '/transactions', color: 'text-cyan-400' },
    { label: 'Comptes', desc: 'Gestion et répartition de vos comptes', icon: Wallet, path: '/comptes', color: 'text-muted-foreground' },
    { label: 'Guide Financier', desc: 'Missions chiffrées, progression, conseils', icon: Map, path: '/plan', color: 'text-emerald-400' },
    { label: 'Objectifs', desc: "Projets d'épargne, XP et progression", icon: Gift, path: '/objectifs', color: 'text-amber-400' },
    { label: 'Historique', desc: 'Bilans mensuels — saisie manuelle ou auto', icon: History, path: '/historique', color: 'text-violet-400' },
    { label: 'Profil', desc: 'Niveau, score santé, profil investisseur', icon: User, path: '/profil', color: 'text-blue-400' },
    { label: 'Export', desc: 'Sauvegarder vos données', icon: FileDown, path: '/export', color: 'text-blue-400' },
    { label: 'Paramètres', desc: 'PIN, thème, pourcentages, régulation', icon: Settings, path: '/parametres', color: 'text-muted-foreground' },
  ]

  return (
    <div className="flex flex-col gap-3 px-5 pt-6 pb-28">
      <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider mb-2">Plus</h1>
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
