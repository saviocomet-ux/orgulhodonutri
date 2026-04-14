
-- Meal plans table
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Plano Alimentar',
  pdf_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage their meal plans" ON public.meal_plans FOR ALL USING (auth.uid() = nutritionist_id);
CREATE POLICY "Patients can view their meal plans" ON public.meal_plans FOR SELECT USING (auth.uid() = patient_id);

-- Meal plan items table
CREATE TABLE public.meal_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  scheduled_time TIME NOT NULL DEFAULT '08:00',
  foods TEXT NOT NULL DEFAULT '',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage meal plan items" ON public.meal_plan_items FOR ALL
USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_items.plan_id AND mp.nutritionist_id = auth.uid()));

CREATE POLICY "Patients can view their meal plan items" ON public.meal_plan_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_items.plan_id AND mp.patient_id = auth.uid()));

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-plans', 'meal-plans', true);

CREATE POLICY "Nutritionists can upload meal plan PDFs" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meal-plans' AND auth.uid() IS NOT NULL);

CREATE POLICY "Nutritionists can update meal plan PDFs" ON storage.objects FOR UPDATE
USING (bucket_id = 'meal-plans' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view meal plan PDFs" ON storage.objects FOR SELECT
USING (bucket_id = 'meal-plans');

-- Allow nutritionists to update linked patient profiles
CREATE POLICY "Nutritionists can update linked patient profiles" ON public.profiles FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = profiles.user_id));

-- Timestamps trigger
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
