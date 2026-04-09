
-- Table pour stocker le FinanceStore JSON par utilisateur
CREATE TABLE public.finance_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_stores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own finance store"
  ON public.finance_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own finance store"
  ON public.finance_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance store"
  ON public.finance_stores FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_finance_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_finance_stores_updated_at
  BEFORE UPDATE ON public.finance_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_stores_updated_at();
