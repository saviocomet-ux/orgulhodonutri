import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface InvitePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

const InvitePatientDialog = ({ open, onOpenChange, onInvited }: InvitePatientDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!user || !email.trim()) return;
    setLoading(true);

    // Check if already invited
    const { data: existing } = await supabase
      .from("patient_invites")
      .select("id, status")
      .eq("nutritionist_id", user.id)
      .eq("patient_email", email.trim().toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      toast.info("Já existe um convite pendente para este email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("patient_invites").insert({
      nutritionist_id: user.id,
      patient_email: email.trim().toLowerCase(),
    });

    if (error) {
      toast.error("Erro ao registrar convite no sistema.");
    } else {
      // Disparar e-mail real via Edge Function
      const { profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      
      await supabase.functions.invoke("send-invite-email", {
        body: { 
          email: email.trim().toLowerCase(), 
          type: "patient",
          sender_name: profile?.full_name || "Seu Nutricionista"
        },
      });

      toast.success("Convite enviado com sucesso para o e-mail do paciente!");
      setEmail("");
      onOpenChange(false);
      onInvited?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Paciente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite o email do paciente. Ele receberá o convite ao fazer login no app.
          </p>
          <Input
            type="email"
            placeholder="Email do paciente"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleInvite} className="w-full" disabled={loading || !email.trim()}>
            {loading ? "Enviando..." : "Enviar Convite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitePatientDialog;
