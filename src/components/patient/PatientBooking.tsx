import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Clock, CalendarCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PatientBooking = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar slots disponíveis (do nutricionista vinculado)
      // Primeiro pegar o ID do nutricionista
      const { data: linkData } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user!.id)
        .single();

      if (linkData) {
        const { data: slotsData } = await supabase
          .from("appointment_slots")
          .select("*")
          .eq("nutri_id", linkData.nutritionist_id)
          .eq("is_booked", false)
          .gte("start_time", new Date().toISOString())
          .order("start_time");
        
        if (slotsData) setSlots(slotsData);
      }

      // Buscar meus agendamentos
      const { data: apptData } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", user!.id)
        .order("scheduled_at", { ascending: true });
      
      if (apptData) setMyAppointments(apptData);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const bookSlot = async (slotId: string, scheduledAt: string, nutriId: string) => {
    // 1. Criar agendamento
    const { error: apptError } = await supabase.from("appointments").insert({
      nutri_id: nutriId,
      patient_id: user!.id,
      slot_id: slotId,
      scheduled_at: scheduledAt,
      status: "pending"
    });

    if (apptError) {
      toast.error("Erro ao solicitar agendamento.");
      return;
    }

    // 2. Marcar slot como reservado
    await supabase.from("appointment_slots").update({ is_booked: true }).eq("id", slotId);

    toast.success("Solicitação enviada! Aguarde a confirmação do nutricionista.");
    fetchData();
  };

  if (isLoading) return <div className="text-center py-8">Carregando agenda...</div>;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Minhas Consultas
          </CardTitle>
          <CardDescription>Acompanhe suas solicitações e agendamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {myAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma consulta agendada.</p>
          ) : (
            myAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(appt.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appt.scheduled_at), "HH:mm")}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={appt.status === "confirmed" ? "default" : appt.status === "pending" ? "secondary" : "destructive"}
                  className="capitalize"
                >
                  {appt.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Horários Disponíveis
        </h3>
        
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário disponível para reserva no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot) => (
              <Button
                key={slot.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-1 text-left border-primary/10 hover:border-primary/50 hover:bg-primary/5 group"
                onClick={() => bookSlot(slot.id, slot.start_time, slot.nutri_id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold text-foreground">
                    {format(new Date(slot.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  <div className="h-6 w-6 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Reservar este horário</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
