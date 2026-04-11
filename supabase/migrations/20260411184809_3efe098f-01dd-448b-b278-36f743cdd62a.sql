
-- 1. Tabela de códigos de convite para cadastro de nutricionistas
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check invite codes" ON public.invite_codes
  FOR SELECT USING (true);

CREATE POLICY "System can update invite codes" ON public.invite_codes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 2. Tabela de vínculo nutricionista-paciente
CREATE TABLE public.nutritionist_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  link_code TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nutritionist_id, patient_id)
);

ALTER TABLE public.nutritionist_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can view their patients" ON public.nutritionist_patients
  FOR SELECT USING (auth.uid() = nutritionist_id);

CREATE POLICY "Patients can view their nutritionist link" ON public.nutritionist_patients
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert link" ON public.nutritionist_patients
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Adicionar coluna link_code na profiles do nutri para gerar código de vínculo
ALTER TABLE public.profiles ADD COLUMN link_code TEXT UNIQUE;

-- 3. Tabela de modelos de questionário
CREATE TABLE public.questionnaire_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage their templates" ON public.questionnaire_templates
  FOR ALL USING (auth.uid() = nutritionist_id);

CREATE POLICY "Anyone can view system defaults" ON public.questionnaire_templates
  FOR SELECT USING (is_system_default = true);

CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON public.questionnaire_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tabela de perguntas do questionário
CREATE TABLE public.questionnaire_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'scale', -- scale, number, text, choice
  options JSONB, -- para tipo choice: ["opção1", "opção2"]
  display_order INTEGER NOT NULL DEFAULT 0,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage questions via template" ON public.questionnaire_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_templates t
      WHERE t.id = template_id AND t.nutritionist_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view system default questions" ON public.questionnaire_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_templates t
      WHERE t.id = template_id AND t.is_system_default = true
    )
  );

-- 5. Tabela de questionários enviados (assignments)
CREATE TABLE public.questionnaire_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage assignments" ON public.questionnaire_assignments
  FOR ALL USING (auth.uid() = nutritionist_id);

CREATE POLICY "Patients can view their assignments" ON public.questionnaire_assignments
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update their assignments" ON public.questionnaire_assignments
  FOR UPDATE USING (auth.uid() = patient_id);

-- 6. Tabela de respostas
CREATE TABLE public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.questionnaire_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  response_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert their responses" ON public.questionnaire_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaire_assignments a
      WHERE a.id = assignment_id AND a.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their responses" ON public.questionnaire_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_assignments a
      WHERE a.id = assignment_id AND a.patient_id = auth.uid()
    )
  );

CREATE POLICY "Nutritionists can view responses of their patients" ON public.questionnaire_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_assignments a
      WHERE a.id = assignment_id AND a.nutritionist_id = auth.uid()
    )
  );

-- Permitir que nutricionistas vejam água, refeições e perfis dos pacientes vinculados
CREATE POLICY "Nutritionists can view linked patient water logs" ON public.water_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.patient_id = water_logs.user_id
    )
  );

CREATE POLICY "Nutritionists can view linked patient meals" ON public.meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.patient_id = meals.user_id
    )
  );

CREATE POLICY "Nutritionists can view linked patient profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.patient_id = profiles.user_id
    )
  );
