
-- Adicionar campos extras na tabela de convites de pacientes
ALTER TABLE public.patient_invites 
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_altura NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS patient_peso NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS patient_idade INTEGER;

-- Atualizar RLS para permitir que pacientes vejam seus convites pelo token também
DROP POLICY IF EXISTS "Patients can view invites for their email" ON public.patient_invites;
CREATE POLICY "Patients can view invites for their token"
  ON public.patient_invites FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Patients can update invite status" ON public.patient_invites;
CREATE POLICY "Patients can update invite status"
  ON public.patient_invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND 
    (auth.email() = patient_email OR EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email = patient_email
    ))
  );
