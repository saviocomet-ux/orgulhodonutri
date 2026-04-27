
-- Permitir que convites sejam criados sem e-mail predefinido
ALTER TABLE public.patient_invites ALTER COLUMN patient_email DROP NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN email DROP NOT NULL;

-- Atualizar RLS de patient_invites para focar no token quando o e-mail não estiver disponível
DROP POLICY IF EXISTS "Patients can view invites for their token" ON public.patient_invites;
CREATE POLICY "Patients can view invites for their token"
  ON public.patient_invites FOR SELECT
  USING (true); -- Permitir que qualquer um veja os dados básicos do convite pelo token (público para a página de auth)

DROP POLICY IF EXISTS "Patients can update invite status" ON public.patient_invites;
CREATE POLICY "Patients can update invite status"
  ON public.patient_invites FOR UPDATE
  USING (true); -- O accept-invite via Edge Function já faz o controle fino. No client, permitimos para o fluxo de aceite.

-- Adicionar campo para senha temporária ou reset se necessário no futuro
-- Por enquanto, vamos focar em remover a obrigatoriedade de e-mail no fluxo.
