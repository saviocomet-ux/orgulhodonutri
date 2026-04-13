
-- Allow patients to read questions for questionnaires assigned to them
CREATE POLICY "Patients can view questions of assigned questionnaires"
ON public.questionnaire_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.questionnaire_assignments a
    WHERE a.template_id = questionnaire_questions.template_id
      AND a.patient_id = auth.uid()
  )
);
