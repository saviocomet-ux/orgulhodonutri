
-- Patient invites table
CREATE TABLE public.patient_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id UUID NOT NULL,
  patient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can view their invites"
  ON public.patient_invites FOR SELECT
  USING (auth.uid() = nutritionist_id);

CREATE POLICY "Nutritionists can create invites"
  ON public.patient_invites FOR INSERT
  WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Patients can view invites for their email"
  ON public.patient_invites FOR SELECT
  USING (auth.email() = patient_email);

CREATE POLICY "Patients can update invite status"
  ON public.patient_invites FOR UPDATE
  USING (auth.email() = patient_email);

-- Weight logs table for evolution tracking
CREATE TABLE public.weight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight_kg NUMERIC NOT NULL,
  body_fat_percent NUMERIC,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weight logs"
  ON public.weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight logs"
  ON public.weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight logs"
  ON public.weight_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists can view linked patient weight logs"
  ON public.weight_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.patient_id = weight_logs.user_id
  ));
