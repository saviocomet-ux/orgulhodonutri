import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplets } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [view, setView] = useState<"login" | "signup" | "forgot" | "update">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isNutri, setIsNutri] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detect password recovery mode from URL hash
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
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (signUpData.user && isNutri) {
        const res = await supabase.functions.invoke("upgrade-to-nutri", {
          body: { email: email.trim().toLowerCase(), user_id: signUpData.user.id },
        });

        if (res.error || (res.data && res.data.error)) {
          toast.error(res.data?.error || "E-mail não possui um convite de nutricionista válido.");
        } else {
          toast.success("Conta de nutricionista criada! Verifique seu email.");
        }
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
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
            {view === "signup" && "Crie sua conta"}
            {view === "forgot" && "Recuperar senha"}
            {view === "update" && "Definir nova senha"}
          </CardDescription>
        </CardHeader>
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
