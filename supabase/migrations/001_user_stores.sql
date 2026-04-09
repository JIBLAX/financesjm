-- Table: one store per user (full JSON blob)
CREATE TABLE IF NOT EXISTS public.user_stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT user_stores_user_id_unique UNIQUE (user_id)
);

-- Row Level Security
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own store"
  ON public.user_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store"
  ON public.user_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store"
  ON public.user_stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store"
  ON public.user_stores FOR DELETE
  USING (auth.uid() = user_id);
