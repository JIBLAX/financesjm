import { createClient } from '@supabase/supabase-js'

const BA_URL  = 'https://weecciwwbqsvmnaiahpw.supabase.co'
const BA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWNjaXd3YnFzdm1uYWlhaHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzE1MzYsImV4cCI6MjA4ODcwNzUzNn0.JXHuptJiF4UJgby_yYMUYZ9BAHg9NczJy9_x1OuaOG0'

export const beActivClient = createClient(BA_URL, BA_ANON, {
  auth: { persistSession: false },
})
