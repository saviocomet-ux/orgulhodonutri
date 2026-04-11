import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplets, LogOut, Users, Copy, ClipboardList, ChevronRight } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import PatientDetail from "@/components/nutri/PatientDetail";
import QuestionnaireManager from "@/components/nutri/QuestionnaireManager";

type Profile = Tables<"profiles">;

interface PatientWithProfile {
  patient_id: string;
  profile: Profile | null;
}

const NutriDashboard = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [view, setView] = useState<"patients" | "questionnaires">("patients");
  const [linkCode, setLinkCode] = useState<string | null>(profile?.link_code ?? null);

  useEffect(() => {
    if (profile?.link_code) setLinkCode(profile.link_code);
  }, [profile]);

  const generateLinkCode = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase
      .from("profiles")
      .update({ link_code: code })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao gerar código");
    } else {
      setLinkCode(code);
      refreshProfile();
      toast.success("Código gerado!");
    }
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      toast.success("Código copiado!");
    }
  };

  const fetchPatients = async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id);

    if (!links || links.length === 0) {
      setPatients([]);
      return;
    }

    const patientIds = links.map((l) => l.patient_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", patientIds);

    setPatients(
      links.map((l) => ({
        patient_id: l.patient_id,
        profile: profiles?.find((p) => p.user_id === l.patient_id) ?? null,
      }))
    );
  };

  useEffect(() => {
    fetchPatients();
  }, [user]);

  if (selectedPatient) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedPatient(null)}>
              ← Voltar
            </Button>
            <h1 className="text-lg font-semibold text-foreground">Detalhes do Paciente</h1>
            <div />
          </div>
        </header>
        <PatientDetail patientId={selectedPatient} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">NutriTrack</h1>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Nutri</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <p className="text-muted-foreground">
          Olá, <span className="font-medium text-foreground">{profile?.full_name || "Nutricionista"}</span>
        </p>

        {/* Link Code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Código de Vínculo</CardTitle>
          </CardHeader>
          <CardContent>
            {linkCode ? (
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-muted px-4 py-2 text-xl font-mono font-bold tracking-widest text-foreground">
                  {linkCode}
                </span>
                <Button variant="outline" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={generateLinkCode}>Gerar código</Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Compartilhe este código com seus pacientes para que eles se vinculem a você.
            </p>
          </CardContent>
        </Card>

        {/* Nav Tabs */}
        <div className="flex gap-2">
          <Button
            variant={view === "patients" ? "default" : "outline"}
            onClick={() => setView("patients")}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Pacientes ({patients.length})
          </Button>
          <Button
            variant={view === "questionnaires" ? "default" : "outline"}
            onClick={() => setView("questionnaires")}
            className="flex-1"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Questionários
          </Button>
        </div>

        {view === "patients" ? (
          <Card>
            <CardContent className="pt-4">
              {patients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum paciente vinculado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {patients.map((p) => (
                    <button
                      key={p.patient_id}
                      onClick={() => setSelectedPatient(p.patient_id)}
                      className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-sm text-foreground">
                          {p.profile?.full_name || "Paciente"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.profile?.peso_atual}kg · {p.profile?.altura}m · {p.profile?.idade} anos
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <QuestionnaireManager patients={patients} />
        )}
      </main>
    </div>
  );
};

export default NutriDashboard;
