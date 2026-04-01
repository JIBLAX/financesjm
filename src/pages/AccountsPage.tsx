import React, { useState } from 'react'
import { Building2, Banknote, PiggyBank, Briefcase, Star, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore, Account } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (a: Account) => void
  onUpdate: (id: string, patch: Partial<Account>) => void
  onRemove: (id: string) => void
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pro: { label: 'Professionnel', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
  courant: { label: 'Courant', icon: <Building2 className="w-4 h-4" />, color: 'text-emerald-400' },
  livret: { label: 'Épargne', icon: <PiggyBank className="w-4 h-4" />, color: 'text-amber-400' },
  liquide: { label: 'Espèces', icon: <Banknote className="w-4 h-4" />, color: 'text-violet-400' },
  epargne_projet: { label: 'Épargne Projet', icon: <Star className="w-4 h-4" />, color: 'text-cyan-400' },
  investissement: { label: 'Investissement', icon: <Star className="w-4 h-4" />, color: 'text-primary' },
  dette: { label: 'Dette', icon: <Banknote className="w-4 h-4" />, color: 'text-destructive' },
}

const ACCOUNT_TYPES: Account['type'][] = ['courant', 'livret', 'liquide', 'epargne_projet', 'investissement', 'pro', 'dette']

const emptyForm = (): Omit<Account, 'id'> => ({
  name: '',
  institution: '',
  type: 'courant',
  subtype: '',
  currency: 'EUR',
  currentBalance: 0,
  isActive: true,
  group: '',
  note: '',
})

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; account: Account }
  | null

export const AccountsPage: React.FC<Props> = ({ store, onAdd, onUpdate, onRemove }) => {
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<Omit<Account, 'id'>>(emptyForm())
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const openAdd = () => {
    setForm(emptyForm())
    setModal({ mode: 'add' })
  }

  const openEdit = (a: Account) => {
    setForm({ name: a.name, institution: a.institution, type: a.type, subtype: a.subtype, currency: a.currency, currentBalance: a.currentBalance, isActive: a.isActive, group: a.group || '', note: a.note || '' })
    setModal({ mode: 'edit', account: a })
  }

  const closeModal = () => { setModal(null); setDeleteConfirm(null) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal?.mode === 'add') {
      onAdd({ ...form, id: `acc_${Date.now()}`, group: form.group || undefined, note: form.note || undefined })
    } else if (modal?.mode === 'edit') {
      onUpdate(modal.account.id, { ...form, group: form.group || undefined, note: form.note || undefined })
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onRemove(id)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
    }
  }

  const total = store.accounts.filter(a => a.isActive).reduce((s, a) => s + a.currentBalance, 0)
  const proAccounts = store.accounts.filter(a => a.isActive && a.type === 'pro')
  const proTotal = proAccounts.reduce((s, a) => s + a.currentBalance, 0)
  const mainAccounts = store.accounts.filter(a => a.isActive && a.group !== 'bunq' && a.type !== 'pro')
  const bunqAccounts = store.accounts.filter(a => a.isActive && a.group === 'bunq' && a.type !== 'pro')

  const grouped = mainAccounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const renderAccount = (a: Account) => (
    <FinanceCard key={a.id}>
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{a.name}</p>
          <p className="text-xs text-muted-foreground">{a.institution}{a.subtype ? ` · ${a.subtype}` : ''}</p>
          {a.note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{a.note}</p>}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <p className={`text-base font-bold ${a.currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
            {formatCurrency(a.currentBalance)}
          </p>
          <button onClick={() => openEdit(a)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(a.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center active:bg-muted/50 ${deleteConfirm === a.id ? 'text-destructive' : 'text-muted-foreground'}`}>
            {deleteConfirm === a.id ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {deleteConfirm === a.id && (
        <div className="mt-2 flex gap-2 items-center">
          <p className="text-xs text-destructive flex-1">Confirmer la suppression ?</p>
          <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 rounded-lg text-xs bg-muted/50 text-foreground">Annuler</button>
        </div>
      )}
    </FinanceCard>
  )

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total comptes</p>
          <h1 className="text-3xl font-bold text-foreground">{formatCurrency(total)}</h1>
        </div>
        <button onClick={openAdd} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {proAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400"><Briefcase className="w-4 h-4" /></span>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professionnel</h2>
          </div>
          <div className="space-y-2">
            {proAccounts.map(renderAccount)}
          </div>
          {proAccounts.length > 1 && (
            <div className="mt-2 px-4 py-2 bg-muted/20 rounded-xl flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Trésorerie pro totale</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(proTotal)}</span>
            </div>
          )}
        </div>
      )}

      {Object.entries(grouped).map(([type, accounts]) => {
        const cfg = typeConfig[type] || { label: type, icon: null, color: 'text-foreground' }
        const groupTotal = accounts.reduce((s, a) => s + a.currentBalance, 0)
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={cfg.color}>{cfg.icon}</span>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}</h2>
              </div>
              <span className="text-sm font-medium text-foreground">{formatCurrency(groupTotal)}</span>
            </div>
            <div className="space-y-2">{accounts.map(renderAccount)}</div>
          </div>
        )
      })}

      {bunqAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-cyan-400"><Star className="w-4 h-4" /></span>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">BUNQ — Comptes annexes</h2>
          </div>
          <div className="space-y-2">{bunqAccounts.map(renderAccount)}</div>
        </div>
      )}

      {store.accounts.filter(a => a.isActive).length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Aucun compte — appuyez sur + pour en ajouter un</p>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">
                {modal.mode === 'add' ? 'Nouveau compte' : 'Modifier le compte'}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <label className="text-xs text-muted-foreground">Nom *</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Ex: Compte courant" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Banque / Institution</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Ex: BNP Paribas" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ACCOUNT_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${form.type === t ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      {typeConfig[t]?.label || t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sous-type (ex: PEA, Livret A…)</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Solde actuel (€)</label>
                <input type="number" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="0" value={form.currentBalance} onChange={e => setForm(f => ({ ...f, currentBalance: parseFloat(e.target.value) || 0 }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Groupe (ex: bunq) — optionnel</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.group || ''} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Note</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-1">Compte actif</label>
                <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-muted/50'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <button onClick={handleSave} disabled={!form.name.trim()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                {modal.mode === 'add' ? 'Ajouter le compte' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
