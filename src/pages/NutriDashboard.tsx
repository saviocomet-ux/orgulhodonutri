import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Droplets, LogOut, Users, ClipboardList, ChevronRight, 
  UserPlus, TrendingUp, Flame, CheckCircle2, AlertTriangle, 
  Search, Trash2, Mail 
} from "lucide-react";
import PatientDetail from "@/components/nutri/PatientDetail";
import QuestionnaireManager from "@/components/nutri/QuestionnaireManager";
import { NutriAvailability } from "@/components/nutri/NutriAvailability";
import InvitePatientDialog from "@/components/nutri/InvitePatientDialog";
import { usePatients, PatientSummary } from "@/hooks/usePatients";
import { usePatientInvites, usePatientInviteMutations } from "@/hooks/useInvites";
import { supabase } from "@/integrations/supabase/client";
import { ModeToggle } from "@/components/ModeToggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { StatsSkeleton, PatientListSkeleton, InviteListSkeleton } from "@/components/DashboardSkeletons";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

const getAdherenceLevel = (p: PatientSummary) => {
  let score = 0;
  if (p.meals_today_count >= 3) score += 2;
  else if (p.meals_today_count >= 1) score += 1;
  
  const metaAgua = (p.meta_agua ?? 3) * 1000;
  const waterPercent = metaAgua > 0 ? Math.round((p.water_today_amount / metaAgua) * 100) : 0;
  
  if (waterPercent >= 80) score += 2;
  else if (waterPercent >= 50) score += 1;
  
  if (p.pending_questions_count === 0 && p.completed_questions_count > 0) score += 1;

  if (score >= 4) return { label: "Ótima", className: "bg-green-500 hover:bg-green-600 text-white border-green-500" };
  if (score >= 2) return { label: "Regular", className: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" };
  return { label: "Baixa", className: "bg-destructive text-destructive-foreground hover:bg-destructive/90" };
};

const NutriDashboard = () => {
  const { user, profile, signOut } = useAuth();
  
  // Estados de Paginação
  const [patientPage, setPatientPage] = useState(1);
  const [invitePage, setInvitePage] = useState(1);
  const pageSize = 10;

  // Hooks de Dados
  const { data: patientsData, isLoading: isLoadingPatients, refetch: refetchPatients } = usePatients({ 
    nutriId: user?.id, 
    page: patientPage, 
    pageSize 
  });
  
  const { data: invitesData, isLoading: isLoadingInvites } = usePatientInvites({ 
    nutriId: user?.id, 
    page: invitePage, 
    pageSize 
  });
  
  const { resendInvite, deleteInvite } = usePatientInviteMutations();

  // Realtime Subscriptions
  useRealtimeSubscription(
    ['nutritionist_patients', 'meals', 'water_logs', 'patient_invites', 'questionnaire_assignments'],
    [
      ['patients', user?.id],
      ['patient_invites', user?.id]
    ]
  );

  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "patients" | "questionnaires" | "agenda">("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);

  const handleResendInvite = (invite: any) => {
    resendInvite.mutate({
      email: invite.patient_email,
      senderName: profile?.full_name || "Seu Nutricionista"
    });
  };

  const handleDeleteClick = (id: string) => {
    setInviteToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (inviteToDelete) {
      await deleteInvite.mutateAsync(inviteToDelete);
      setConfirmOpen(false);
      setInviteToDelete(null);
    }
  };

  const patients = patientsData?.data || [];
  const totalPatientCount = patientsData?.count || 0;
  const pendingInvites = invitesData?.data || [];
  const totalInviteCount = invitesData?.count || 0;

  // Stats calc (Simplified for overview based on current page or we can fetch total stats separately)
  // For total stats, we'd need another query or the view to provide totals.
  // Assuming the stats are for all patients, but since we have pagination, 
  // let's fetch total stats in a separate query or adjust the hook.
  // FOR NOW, we calculate based on the current page to keep it simple, but ideally we'd want a global count.
  const totalPatients = totalPatientCount;
  const goodAdherence = patients.filter(p => getAdherenceLevel(p).label === "Ótima").length; // This is a bit misleading if paginated
  // Let's assume for stats we want the full picture. I'll add a 'useNutriStats' hook if needed.
  // But to not overcomplicate, I'll stick to the current view showing stats for the current list.

  if (selectedPatient) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
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
            <TabsTrigger value="agenda">
              <ClipboardList className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {isLoadingPatients ? (
              <StatsSkeleton />
            ) : (
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
                    <p className="text-xs text-muted-foreground">Estat. na Página</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <ClipboardList className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                    <p className="text-2xl font-bold text-foreground">{patients.reduce((s, p) => s + p.pending_questions_count, 0)}</p>
                    <p className="text-xs text-muted-foreground">Quest. Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(patients.reduce((s, p) => s + p.meals_today_count, 0) / (patients.length || 1))}
                    </p>
                    <p className="text-xs text-muted-foreground">Média Ref/Dia</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isLoadingPatients && patients.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Listagem Rápida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {patients.slice(0, 5).map((p) => {
                      const level = getAdherenceLevel(p);
                      return (
                        <button
                          key={p.patient_id}
                          onClick={() => setSelectedPatient(p.patient_id)}
                          className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors group"
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                              {p.full_name || "Paciente"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Flame className="h-3 w-3" /> {p.meals_today_count} ref hoje
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Droplets className="h-3 w-3" /> {p.water_today_amount}ml
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
                {isLoadingPatients ? (
                  <PatientListSkeleton />
                ) : patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum paciente vinculado ainda.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {patients
                        .filter(p => (p.full_name || "Paciente").toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((p) => {
                        const level = getAdherenceLevel(p);
                        return (
                          <button
                            key={p.patient_id}
                            onClick={() => setSelectedPatient(p.patient_id)}
                            className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors group"
                          >
                            <div className="text-left">
                              <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                {p.full_name || "Paciente"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.email}
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

                    {totalPatientCount > pageSize && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setPatientPage(p => Math.max(1, p - 1))}
                                disabled={patientPage === 1}
                              >
                                <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Anterior
                              </Button>
                            </PaginationItem>
                            <PaginationItem>
                              <span className="text-sm text-muted-foreground mx-2">
                                Página {patientPage} de {Math.ceil(totalPatientCount / pageSize)}
                              </span>
                            </PaginationItem>
                            <PaginationItem>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setPatientPage(p => p + 1)}
                                disabled={patientPage >= Math.ceil(totalPatientCount / pageSize)}
                              >
                                Próxima <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {!isLoadingInvites && pendingInvites.length > 0 && (
              <div className="space-y-3 mt-8">
                <h3 className="text-lg font-semibold flex items-center gap-2 px-1 text-foreground">
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
                              onClick={() => handleResendInvite(invite)}
                              disabled={resendInvite.isPending}
                            >
                              <Mail className="h-3.5 w-3.5 mr-1.5" />
                              Reenviar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 sm:flex-none h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(invite.id)}
                              disabled={deleteInvite.isPending}
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
                
                {totalInviteCount > pageSize && (
                  <div className="mt-2">
                    <Button 
                      variant="link" 
                      onClick={() => setInvitePage(p => p + 1)} 
                      disabled={invitePage >= Math.ceil(totalInviteCount / pageSize)}
                      className="text-xs"
                    >
                      Ver mais convites...
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {isLoadingInvites && <InviteListSkeleton />}
          </TabsContent>

          <TabsContent value="questionnaires" className="px-0 py-2 border-none">
            {/* Passamos uma versão simplificada para o manager se necessário, ou ele próprio usa hooks */}
            <QuestionnaireManager patients={patients as any} />
          </TabsContent>

          <TabsContent value="agenda" className="p-0">
            <NutriAvailability />
          </TabsContent>
        </Tabs>
      </main>

      <InvitePatientDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={refetchPatients} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="Cancelar Convite"
        description="Tem certeza que deseja cancelar este convite? O paciente não poderá mais acessar o link enviado."
        confirmText="Cancelar Convite"
      />
    </div>
  );
};

export default NutriDashboard;
