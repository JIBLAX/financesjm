import React, { useState } from 'react'
import { ArrowLeft, Download, Upload, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { exportData, importData, resetStore } from '@/lib/storage'
import type { FinanceStore } from '@/types/finance'

interface Props {
  onImport: (store: FinanceStore) => void
  onReset: () => void
}

export const ExportPage: React.FC<Props> = ({ onImport, onReset }) => {
  const navigate = useNavigate()
  const [showReset, setShowReset] = useState(false)

  const handleExportJSON = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finances-jm-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const store = JSON.parse(exportData()) as FinanceStore
    const rows = [['Date', 'Libellé', 'Montant', 'Type', 'Source', 'Compte', 'Catégorie', 'Note']]
    store.transactions.forEach(t => {
      const acc = store.accounts.find(a => a.id === t.accountId)?.name || ''
      const cat = store.categories.find(c => c.id === t.categoryId)?.name || ''
      rows.push([t.date, t.label, String(t.amount), t.direction, t.sourceType, acc, cat, t.note])
    })
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finances-jm-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const store = importData(text)
        onImport(store)
      } catch {
        alert('Fichier invalide')
      }
    }
    input.click()
  }

  const handleReset = () => {
    const store = resetStore()
    onImport(store)
    setShowReset(false)
  }

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Export & Import</h1>
      </div>

      <FinanceCard onClick={handleExportJSON}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Exporter JSON</p>
            <p className="text-xs text-muted-foreground">Sauvegarde complète</p>
          </div>
        </div>
      </FinanceCard>

      <FinanceCard onClick={handleExportCSV}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Exporter CSV</p>
            <p className="text-xs text-muted-foreground">Transactions pour Excel</p>
          </div>
        </div>
      </FinanceCard>

      <FinanceCard onClick={handleImport}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Importer JSON</p>
            <p className="text-xs text-muted-foreground">Restaurer une sauvegarde</p>
          </div>
        </div>
      </FinanceCard>

      <div className="border-t border-border/50 my-2" />

      {!showReset ? (
        <FinanceCard onClick={() => setShowReset(true)} className="border-destructive/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Réinitialiser</p>
              <p className="text-xs text-muted-foreground">Supprimer toutes les données</p>
            </div>
          </div>
        </FinanceCard>
      ) : (
        <FinanceCard className="border-destructive/30 space-y-3">
          <p className="text-sm text-destructive font-medium">Êtes-vous sûr ? Toutes vos données seront perdues.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowReset(false)} className="flex-1 py-2 rounded-xl text-sm font-medium bg-muted/50 text-foreground">Annuler</button>
            <button onClick={handleReset} className="flex-1 py-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground">Confirmer</button>
          </div>
        </FinanceCard>
      )}
    </div>
  )
}
