import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const NutriAvailability = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (!user || !selectedDate) return;
    fetchSlots();
  }, [user, selectedDate]);

  const fetchSlots = async () => {
    const startOfDay = new Date(selectedDate!);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate!);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("appointment_slots")
      .select("*")
      .eq("nutri_id", user!.id)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time");
    
    if (data) setSlots(data);
  };

  const addSlot = async () => {
    if (!user || !selectedDate) return;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const start = new Date(selectedDate);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(endH, endM, 0, 0);

    if (end <= start) {
      toast.error("O horário de término deve ser após o início.");
      return;
    }

    const { error } = await supabase.from("appointment_slots").insert({
      nutri_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });

    if (error) {
      toast.error("Erro ao adicionar horário.");
    } else {
      toast.success("Horário adicionado com sucesso!");
      fetchSlots();
    }
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("appointment_slots").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover horário.");
    } else {
      toast.success("Horário removido.");
      fetchSlots();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Configurar Agenda
          </CardTitle>
          <CardDescription>Selecione um dia para gerenciar seus horários</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border mx-auto"
            locale={ptBR}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Adicionar Novo Horário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Início</p>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Fim</p>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={addSlot}>
              <Plus className="h-4 w-4" /> Adicionar Slot
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/10 flex-1 h-full">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Horários Disponíveis em {selectedDate ? format(selectedDate, "dd/MM") : ""}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum horário definido para este dia.</p>
            ) : (
              slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {format(new Date(slot.start_time), "HH:mm")} - {format(new Date(slot.end_time), "HH:mm")}
                    </span>
                    {slot.is_booked && <Badge variant="secondary">Agendado</Badge>}
                  </div>
                  {!slot.is_booked && (
                    <Button variant="ghost" size="sm" onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
