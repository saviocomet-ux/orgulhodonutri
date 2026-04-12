
CREATE POLICY "Patients can view inviting nutritionist profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_invites pi
      WHERE pi.nutritionist_id = profiles.user_id
        AND pi.patient_email = auth.email()
        AND pi.status = 'pending'
    )
  );
