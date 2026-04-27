import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, LogOut, KeyRound, Copy, Check, Users, Trash2, Mail, ChevronRight } from "lucide-react";
import { useInviteCodes, useManagerMutations } from "@/hooks/useInvites";
import { ModeToggle } from "@/components/ModeToggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { StatsSkeleton, InviteListSkeleton } from "@/components/DashboardSkeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsPanel } from "@/components/manager/AnalyticsPanel";
import { Input } from "@/components/ui/input";
import { 
  BarChart3,
  Ticket
} from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

const ManagerDashboard = () => {
  const { signOut } = useAuth();
  
  // Estados de Paginação
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: invitesData, isLoading: loading } = useInviteCodes({ page, pageSize });
  const { createInvite, deleteInvite, resendInvite } = useManagerMutations();
  
  const codes = invitesData?.data || [];
  const totalCount = invitesData?.count || 0;

  const [profiles, setProfiles] = useState<Record<string, { name: string, count: number }>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);

  // Realtime Subscriptions
  useRealtimeSubscription(
    ['invite_codes', 'profiles', 'nutritionist_patients'],
    [['invite_codes']]
  );

  useEffect(() => {
    const fetchProfiles = async () => {
      const usedBys = codes.filter((c) => c.used_by).map((c) => c.used_by) as string[];
      if (usedBys.length === 0) {
        setProfiles({});
        return;
      }

      const { data: profs, error: profsError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", usedBys);
        
      const { data: npData, error: npError } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .in("nutritionist_id", usedBys);
      
      if (!profsError && profs) {
        const profileMap: Record<string, { name: string, count: number }> = {};
        profs.forEach((p) => {
          const count = (!npError && npData) ? npData.filter(np => np.nutritionist_id === p.user_id).length : 0;
          profileMap[p.user_id] = { name: p.full_name || "Desconhecido", count };
        });
        setProfiles(profileMap);
      }
    };

    if (codes.length > 0) fetchProfiles();
  }, [codes]);

  const handleInvite = async () => {
    if (inviteEmail && !inviteEmail.includes("@")) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }
    await createInvite.mutateAsync(inviteEmail || undefined);
    setInviteEmail("");
    setPage(1);
  };

  const copyNutriLink = (id: string) => {
    const link = `${window.location.origin}/auth?nutri_invite=${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de convite copiado!");
  };

  const handleDeleteClick = (id: string) => {
    setCodeToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (codeToDelete) {
      await deleteInvite.mutateAsync(codeToDelete);
      setConfirmOpen(false);
      setCodeToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">NutriTrack - Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Painel de Administração</h2>
            <p className="text-muted-foreground">Monitore o crescimento e gerencie a plataforma.</p>
          </div>
        </div>

        <Tabs defaultValue="invites" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invites">
              <Ticket className="h-4 w-4 mr-2" />
              Convites
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4">
            <div className="flex items-center gap-2 justify-end">
              <Input 
                type="email" 
                placeholder="E-mail do nutricionista" 
                className="w-full md:w-64"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleInvite} disabled={createInvite.isPending}>
                <KeyRound className="h-4 w-4 mr-2" />
                Convidar
              </Button>
            </div>

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 flex flex-col items-center">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-center">Total de Convites</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex flex-col items-center">
                <Users className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-2xl font-bold">...</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-center text-center">Nutris Ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex flex-col items-center">
                <KeyRound className="h-8 w-8 text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{codes.filter(c => !c.is_used).length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-center">Pendentes (pág)</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nutricionistas Convidados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <InviteListSkeleton />
            ) : codes.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Nenhum código gerado.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {codes.map((code) => (
                    <div key={code.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold tracking-widest text-primary">
                            {code.email || "Link Genérico"}
                          </span>
                          <Badge variant={code.is_used ? "secondary" : "default"} className={code.is_used ? "bg-muted text-muted-foreground" : "bg-green-500 hover:bg-green-600 text-white"}>
                            {code.is_used ? "Utilizado" : "Disponível"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ID: {code.id.split('-')[0]}... | Criado em: {new Date(code.created_at).toLocaleString("pt-BR")}
                        </p>
                        {code.is_used && (
                          <div className="mt-2 space-y-2">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                Utilizado por: <span className="text-primary">{code.used_by ? profiles[code.used_by]?.name || "Carregando..." : "Desconhecido"}</span>
                              </p>
                              <p className="text-sm font-medium text-muted-foreground">
                                Pacientes vinculados: <span className="text-foreground">{code.used_by ? profiles[code.used_by]?.count ?? "..." : 0}</span>
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10 border-destructive/20 h-8 text-xs"
                              onClick={async () => {
                                const newPwd = prompt(`Digite a nova senha para ${profiles[code.used_by!]?.name || 'este nutricionista'} (mínimo 6 caracteres):`);
                                if (newPwd && newPwd.length >= 6) {
                                  try {
                                    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
                                      body: { userId: code.used_by, newPassword: newPwd },
                                    });
                                    if (error) throw error;
                                    toast.success("Senha alterada com sucesso!");
                                  } catch (err) {
                                    toast.error("Erro ao alterar senha.");
                                  }
                                } else if (newPwd) {
                                  toast.error("A senha deve ter pelo menos 6 caracteres.");
                                }
                              }}
                            >
                              <KeyRound className="h-3 w-3 mr-1" /> Resetar Senha
                            </Button>
                          </div>
                        )}
                      </div>
                      {!code.is_used && (
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyNutriLink(code.id)}
                            className="flex-1 sm:flex-none"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link
                          </Button>
                          {code.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvite.mutate(code.email)}
                              disabled={resendInvite.isPending}
                              className="flex-1 sm:flex-none"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Reenviar
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(code.id)}
                            disabled={deleteInvite.isPending}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {totalCount > pageSize && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Anterior
                          </Button>
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-sm text-muted-foreground mx-2">
                             Página {page} de {Math.ceil(totalCount / pageSize)}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= Math.ceil(totalCount / pageSize)}
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
      </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </main>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="Excluir Convite"
        description="Tem certeza que deseja excluir este código de convite? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
};

export default ManagerDashboard;
