import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Si les variables d'env ne sont pas définies, Supabase est désactivé
// L'app fonctionne en mode localStorage-only
export const supabaseConfigured =
  typeof supabaseUrl === 'string' && supabaseUrl.startsWith('https://') &&
  typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 10

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
