import { useState, useEffect } from 'react'
import type { AppSettings } from '../types'

const STORAGE_KEY = 'beactiv_settings'
const defaults: AppSettings = { soundEnabled: true, vibrationEnabled: true, coachTag: '' }

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
    } catch { return defaults }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = (patch: Partial<AppSettings>) => setSettings(s => ({ ...s, ...patch }))

  return { settings, update }
}
