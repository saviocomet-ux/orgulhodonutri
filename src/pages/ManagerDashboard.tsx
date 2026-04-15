import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, LogOut, KeyRound, Copy, Check, Users, Trash2, Mail } from "lucide-react";

interface InviteCode {
  id: string;
  email: string;
  is_used: boolean;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const ManagerDashboard = () => {
  const { signOut } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string, count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);

      const usedBys = data?.filter((c) => c.used_by).map((c) => c.used_by) as string[];
      if (usedBys && usedBys.length > 0) {
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
          setProfiles(profileMap as any); // Type assertion or update state type
        }
      }
    } catch (err: any) {
      toast.error("Erro ao carregar convites: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const inviteNutritionist = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("invite_codes").insert({
        email: inviteEmail.trim().toLowerCase(),
      });
      if (error) throw error;

      // Disparar e-mail real via Edge Function
      await supabase.functions.invoke("send-invite-email", {
        body: { 
          email: inviteEmail.trim().toLowerCase(), 
          type: "nutri" 
        },
      });

      toast.success("Convite enviado com sucesso para o nutricionista!");
      setInviteEmail("");
      fetchCodes();
    } catch (err: any) {
      toast.error("Erro ao convidar nutricionista: " + err.message);
      setLoading(false);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este código?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("invite_codes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Código excluído com sucesso!");
      fetchCodes();
    } catch (err: any) {
      toast.error("Erro ao excluir código: " + err.message);
      setLoading(false);
    }
  };

  const resendInvite = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: { 
          email: email.trim().toLowerCase(), 
          type: "nutri" 
        },
      });

      if (error) throw error;
      toast.success("Convite reenviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao reenviar convite: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">NutriTrack - Manager</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Painel de Administração</h2>
            <p className="text-muted-foreground">Gerencie acessos de nutricionistas à plataforma.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="email" 
              placeholder="E-mail do nutricionista" 
              className="flex h-10 w-full md:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button onClick={inviteNutritionist} disabled={loading}>
              <KeyRound className="h-4 w-4 mr-2" />
              Convidar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex flex-col items-center">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <p className="text-2xl font-bold">{codes.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total de Convites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex flex-col items-center">
              <Users className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-2xl font-bold">{codes.filter(c => c.is_used).length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Nutricionistas Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{codes.filter(c => !c.is_used).length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Convites Pendentes</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nutricionistas Convidados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && codes.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Carregando...</p>
            ) : codes.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Nenhum código gerado.</p>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <div key={code.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tracking-widest text-primary">
                          {code.email}
                        </span>
                        <Badge variant={code.is_used ? "secondary" : "default"} className={code.is_used ? "bg-muted text-muted-foreground" : "bg-green-500 hover:bg-green-600"}>
                          {code.is_used ? "Utilizado" : "Disponível"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(code.created_at).toLocaleString("pt-BR")}
                      </p>
                      {code.is_used && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">
                            Utilizado por: <span className="text-primary">{code.used_by ? profiles[code.used_by]?.name || "Usuário não encontrado" : "Desconhecido"}</span>
                          </p>
                          <p className="text-sm font-medium">
                            Pacientes: <span className="text-primary">{code.used_by ? profiles[code.used_by]?.count || 0 : 0}</span>
                          </p>
                        </div>
                      )}
                    </div>
                    {!code.is_used && (
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendInvite(code.email)}
                          disabled={loading}
                          className="flex-1 sm:flex-none"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Reenviar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteCode(code.id)}
                          disabled={loading}
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ManagerDashboard;
