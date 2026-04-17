-- Adicionar campos biométricos em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('M', 'F', 'Other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'));

-- Criar tabela de log de peso
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de inscrições Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own weight logs" ON public.weight_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Nutricionistas podem ver o histórico de peso dos seus pacientes vinculados
CREATE POLICY "Nutritionists can view their patients weight logs" ON public.weight_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients 
      WHERE nutritionist_id = auth.uid() AND patient_id = weight_logs.user_id
    )
  );
