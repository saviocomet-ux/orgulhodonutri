
-- 1. Tabela de Mensagens de Chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'text' -- text, image, system
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Chat
CREATE POLICY "Users can view their own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own received messages (mark as read)" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- 2. Tabela de Slots de Disponibilidade do Nutricionista
CREATE TABLE public.appointment_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutri_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- Políticas de Slots
CREATE POLICY "Nutritionists can manage their slots" ON public.appointment_slots
  FOR ALL USING (auth.uid() = nutri_id);

CREATE POLICY "Anyone can view available slots" ON public.appointment_slots
  FOR SELECT USING (NOT is_booked);

-- 3. Tabela de Agendamentos (Appointments)
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutri_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.appointment_slots(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  notes TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL, -- redundante com slot mas útil se o slot for deletado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de Agendamentos
CREATE POLICY "Nutritionists can manage their appointments" ON public.appointments
  FOR ALL USING (auth.uid() = nutri_id);

CREATE POLICY "Patients can view and manage their own appointments" ON public.appointments
  FOR ALL USING (auth.uid() = patient_id);

-- 4. Funções e Gatilhos
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
