import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplets } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isNutri, setIsNutri] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } else {
      // If nutri, validate invite code first
      if (isNutri) {
        const { data: codeData } = await supabase
          .from("invite_codes")
          .select("*")
          .eq("code", inviteCode.trim().toUpperCase())
          .eq("is_used", false)
          .single();

        if (!codeData) {
          toast.error("Código de convite inválido ou já utilizado.");
          setLoading(false);
          return;
        }
      }

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
        // Call edge function to upgrade role with service key
        await supabase.functions.invoke("upgrade-to-nutri", {
          body: { invite_code: inviteCode.trim().toUpperCase(), user_id: signUpData.user.id },
        });

        // The trigger creates 'patient' role by default, we need an edge function to upgrade
        // For now we'll handle this via a separate mechanism after email confirmation
        toast.success("Conta de nutricionista criada! Verifique seu email.");
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Droplets className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">NutriTrack</CardTitle>
          <CardDescription>
            {isLogin ? "Entre na sua conta" : "Crie sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLogin && (
            <Tabs value={isNutri ? "nutri" : "patient"} onValueChange={(v) => setIsNutri(v === "nutri")} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patient">Paciente</TabsTrigger>
                <TabsTrigger value="nutri">Nutricionista</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <Input
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                {isNutri && (
                  <Input
                    placeholder="Código de convite"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                  />
                )}
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
