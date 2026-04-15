import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Droplets, LogOut, Users, ClipboardList, ChevronRight, UserPlus, TrendingUp, Flame, CheckCircle2, AlertTriangle, Search, Trash2, Mail } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import PatientDetail from "@/components/nutri/PatientDetail";
import QuestionnaireManager from "@/components/nutri/QuestionnaireManager";
import InvitePatientDialog from "@/components/nutri/InvitePatientDialog";

type Profile = Tables<"profiles">;

interface PatientAdherence {
  mealsToday: number;
  waterPercent: number;
  pendingQuestionnaires: number;
  completedQuestionnaires: number;
}

interface PatientWithProfile {
  patient_id: string;
  profile: Profile | null;
  adherence?: PatientAdherence;
}

interface PendingInvite {
  id: string;
  patient_email: string;
  created_at: string;
}

const getAdherenceLevel = (adherence?: PatientAdherence) => {
  if (!adherence) return { label: "Sem dados", color: "secondary" as const };
  
  let score = 0;
  if (adherence.mealsToday >= 3) score += 2;
  else if (adherence.mealsToday >= 1) score += 1;
  if (adherence.waterPercent >= 80) score += 2;
  else if (adherence.waterPercent >= 50) score += 1;
  if (adherence.pendingQuestionnaires === 0 && adherence.completedQuestionnaires > 0) score += 1;

  if (score >= 4) return { label: "Ótima", color: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white border-green-500" };
  if (score >= 2) return { label: "Regular", color: "default" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" };
  return { label: "Baixa", color: "destructive" as const, className: "" };
};

const NutriDashboard = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "patients" | "questionnaires">("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

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
    
    const [profilesRes, mealsRes, waterRes, assignmentsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", patientIds),
      supabase.from("meals").select("user_id").in("user_id", patientIds).gte("logged_at", todayISO),
      supabase.from("water_logs").select("user_id, amount_ml").in("user_id", patientIds).gte("logged_at", todayISO),
      supabase.from("questionnaire_assignments").select("patient_id, status").in("patient_id", patientIds),
    ]);

    const profiles = profilesRes.data || [];
    const meals = mealsRes.data || [];
    const water = waterRes.data || [];
    const assignments = assignmentsRes.data || [];

    setPatients(
      links.map((l) => {
        const prof = profiles.find((p) => p.user_id === l.patient_id) ?? null;
        const patientMeals = meals.filter((m) => m.user_id === l.patient_id);
        const patientWater = water.filter((w) => w.user_id === l.patient_id);
        const totalWater = patientWater.reduce((s, w) => s + w.amount_ml, 0);
        const metaAgua = (prof?.meta_agua ?? 3) * 1000;
        const patientAssignments = assignments.filter((a) => a.patient_id === l.patient_id);

        return {
          patient_id: l.patient_id,
          profile: prof,
          adherence: {
            mealsToday: patientMeals.length,
            waterPercent: metaAgua > 0 ? Math.round((totalWater / metaAgua) * 100) : 0,
            pendingQuestionnaires: patientAssignments.filter((a) => a.status === "pending").length,
            completedQuestionnaires: patientAssignments.filter((a) => a.status === "completed").length,
          },
        };
      })
    );

    // Fetch pending invites
    const { data: invites } = await supabase
      .from("patient_invites")
      .select("id, patient_email, created_at")
      .eq("nutritionist_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    setPendingInvites(invites || []);
  };

  const resendPatientInvite = async (invite: PendingInvite) => {
    if (!user) return;
    setLoadingInvites(true);
    try {
      await supabase.functions.invoke("send-invite-email", {
        body: { 
          email: invite.patient_email, 
          type: "patient",
          sender_name: profile?.full_name || "Seu Nutricionista"
        },
      });
      toast.success("Convite reenviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao reenviar convite: " + err.message);
    } finally {
      setLoadingInvites(false);
    }
  };

  const deletePatientInvite = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este convite?")) return;
    setLoadingInvites(true);
    try {
      const { error } = await supabase
        .from("patient_invites")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Convite cancelado!");
      fetchPatients();
    } catch (err: any) {
      toast.error("Erro ao cancelar convite: " + err.message);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user]);

  // Dashboard stats
  const totalPatients = patients.length;
  const goodAdherence = patients.filter((p) => {
    const level = getAdherenceLevel(p.adherence);
    return level.label === "Ótima";
  }).length;
  const lowAdherence = patients.filter((p) => {
    const level = getAdherenceLevel(p.adherence);
    return level.label === "Baixa";
  }).length;
  const pendingTotal = patients.reduce((s, p) => s + (p.adherence?.pendingQuestionnaires ?? 0), 0);

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

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <header>
          <p className="text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{profile?.full_name || "Nutricionista"}</span>
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
        </header>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Painel</span>
            </TabsTrigger>
            <TabsTrigger value="patients">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="questionnaires">
              <ClipboardList className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Questionários</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{totalPatients}</p>
                  <p className="text-xs text-muted-foreground">Pacientes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
                  <p className="text-2xl font-bold text-foreground">{goodAdherence}</p>
                  <p className="text-xs text-muted-foreground">Aderência Ótima</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-destructive" />
                  <p className="text-2xl font-bold text-foreground">{lowAdherence}</p>
                  <p className="text-xs text-muted-foreground">Aderência Baixa</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <ClipboardList className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                  <p className="text-2xl font-bold text-foreground">{pendingTotal}</p>
                  <p className="text-xs text-muted-foreground">Quest. Pendentes</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick patient list sorted by adherence (worst first) */}
            {patients.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Atenção necessária</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...patients]
                      .sort((a, b) => {
                        const scoreA = (a.adherence?.mealsToday ?? 0) + (a.adherence?.waterPercent ?? 0) / 100;
                        const scoreB = (b.adherence?.mealsToday ?? 0) + (b.adherence?.waterPercent ?? 0) / 100;
                        return scoreA - scoreB;
                      })
                      .slice(0, 5)
                      .map((p) => {
                        const level = getAdherenceLevel(p.adherence);
                        return (
                          <button
                            key={p.patient_id}
                            onClick={() => setSelectedPatient(p.patient_id)}
                            className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors group"
                          >
                            <div className="text-left">
                              <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                {p.profile?.full_name || "Paciente"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Flame className="h-3 w-3" /> {p.adherence?.mealsToday ?? 0} ref
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Droplets className="h-3 w-3" /> {p.adherence?.waterPercent ?? 0}%
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={level.className}>{level.label}</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patients" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => setInviteOpen(true)} className="sm:w-auto w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Paciente
              </Button>
            </div>
            
            <Card>
              <CardContent className="pt-4">
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum paciente vinculado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {patients
                      .filter(p => (p.profile?.full_name || "Paciente").toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((p) => {
                      const level = getAdherenceLevel(p.adherence);
                      return (
                        <button
                          key={p.patient_id}
                          onClick={() => setSelectedPatient(p.patient_id)}
                          className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors group"
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                              {p.profile?.full_name || "Paciente"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.profile?.peso_atual}kg · {p.profile?.altura}m · {p.profile?.idade} anos
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={level.className}>{level.label}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {pendingInvites.length > 0 && (
              <div className="space-y-3 mt-8">
                <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                  <Mail className="h-5 w-5 text-primary" />
                  Convites Pendentes
                </h3>
                <div className="grid gap-3">
                  {pendingInvites
                    .filter(i => i.patient_email.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((invite) => (
                    <Card key={invite.id} className="overflow-hidden border-dashed">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{invite.patient_email}</p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em: {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 sm:flex-none h-8 text-xs"
                              onClick={() => resendPatientInvite(invite)}
                              disabled={loadingInvites}
                            >
                              <Mail className="h-3.5 w-3.5 mr-1.5" />
                              Reenviar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 sm:flex-none h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deletePatientInvite(invite.id)}
                              disabled={loadingInvites}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="questionnaires" className="px-0 py-2 border-none">
            <QuestionnaireManager patients={patients} />
          </TabsContent>
        </Tabs>
      </main>

      <InvitePatientDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={fetchPatients} />
    </div>
  );
};

export default NutriDashboard;
