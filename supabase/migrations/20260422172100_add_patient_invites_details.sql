-- Add detailed biometric fields to patient_invites table
ALTER TABLE public.patient_invites
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_altura NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS patient_peso NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS patient_idade INTEGER;
