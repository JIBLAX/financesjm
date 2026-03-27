import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppSettings } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

const STORAGE_KEY = 'beactiv_settings'
const defaults: AppSettings = { soundEnabled: true, vibrationEnabled: true, coachTag: '' }

function loadLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch { return defaults }
}

export function useSettings(user: User | null) {
  const [settings, setSettings] = useState<AppSettings>(loadLocal)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync depuis Supabase au montage (si connecté)
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        const remote: AppSettings = {
          soundEnabled: data.sound_enabled,
          vibrationEnabled: data.vibration_enabled,
          coachTag: data.coach_tag ?? '',
        }
        setSettings(remote)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
      })
  }, [user])

  // Sauvegarde locale + Supabase (debounced 600ms pour les champs texte)
  const update = (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

      if (supabaseConfigured && supabase && user) {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          supabase.from('profiles').upsert({
            id: user.id,
            sound_enabled: next.soundEnabled,
            vibration_enabled: next.vibrationEnabled,
            coach_tag: next.coachTag,
            updated_at: new Date().toISOString(),
          }).then(() => {})
        }, 600)
      }
      return next
    })
  }

  return { settings, update }
}
