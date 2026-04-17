import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplets, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [view, setView] = useState<"login" | "signup" | "forgot" | "update">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isNutri, setIsNutri] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{nutritionist_id: string; nutritionist_name: string} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      validateInvite(token);
    }

    if (window.location.hash && window.location.hash.includes("type=recovery")) {
      setView("update");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("update");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateInvite = async (token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });
      if (data?.success) {
        setInviteData({
          nutritionist_id: data.nutritionist_id,
          nutritionist_name: data.nutritionist_name || "Seu Nutricionista"
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const clearInviteFromUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", url.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } else if (view === "signup") {
      const { data: signUpRes, error: signUpError } = await supabase.functions.invoke("create-user-confirmed", {
        body: { 
          email: email.trim().toLowerCase(), 
          password, 
          full_name: fullName,
          role: isNutri ? "admin" : "patient"
        },
      });

      if (signUpError || (signUpRes && signUpRes.error)) {
        toast.error(signUpRes?.error || "Erro ao criar conta.");
      } else {
        const userId = signUpRes.user.id;

        // Se for paciente e tiver convite, vincular ao nutri
        if (!isNutri && inviteData?.nutritionist_id) {
          const linkCode = Math.random().toString(36).substring(2, 10);
          await supabase.from("nutritionist_patients").upsert({
            nutritionist_id: inviteData.nutritionist_id,
            patient_id: userId,
            link_code: linkCode,
          }, { onConflict: "nutritionist_id, patient_id" });
          
          if (inviteToken) {
            await supabase.from("patient_invites")
              .update({ status: "accepted", responded_at: new Date().toISOString() })
              .eq("token", inviteToken);
          }
        }

        // Login automático
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password 
        });
        
        if (signInError) {
          toast.error("Conta criada, mas erro ao entrar: " + signInError.message);
        } else {
          toast.success(!isNutri && inviteData ? `Conta vinculada a ${inviteData.nutritionist_name}!` : "Bem-vindo!");
          clearInviteFromUrl();
        }
      }
    } else if (view === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("E-mail de recuperação enviado!");
        setView("login");
      }
    } else if (view === "update") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Senha atualizada com sucesso! Você já pode entrar.");
        setView("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Droplets className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">NutriTrack</CardTitle>
          <CardDescription>
            {view === "login" && "Entre na sua conta"}
            {view === "signup" && inviteData ? `Você foi convidado por ${inviteData.nutritionist_name}` : "Crie sua conta"}
            {view === "forgot" && "Recuperar senha"}
            {view === "update" && "Definir nova senha"}
          </CardDescription>
        </CardHeader>
        {(view === "signup" || view === "login") && inviteData && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <User className="h-5 w-5 text-green-500 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Convite de {inviteData.nutritionist_name}</p>
              <p className="text-muted-foreground text-xs">Aceite para se tornar paciente</p>
            </div>
          </div>
        )}
        <CardContent>
          {view === "signup" && (
            <Tabs value={isNutri ? "nutri" : "patient"} onValueChange={(v) => setIsNutri(v === "nutri")} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patient">Paciente</TabsTrigger>
                <TabsTrigger value="nutri">Nutricionista</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <Input
                placeholder="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            {view !== "update" && (
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            {view !== "forgot" && (
              <Input
                type="password"
                placeholder={view === "update" ? "Nova Senha" : "Senha"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : (
                view === "login" ? "Entrar" :
                view === "signup" ? "Criar conta" :
                view === "forgot" ? "Enviar e-mail" : "Atualizar senha"
              )}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-center">
            {view === "login" && (
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setView("forgot")}
              >
                Esqueci minha senha
              </button>
            )}
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setView(view === "login" ? "signup" : "login")}
            >
              {view === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
