import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Check, Link as LinkIcon } from "lucide-react";

interface InvitePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

const InvitePatientDialog = ({ open, onOpenChange, onInvited }: InvitePatientDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("patient_invites")
      .insert({ 
        nutritionist_id: user.id,
        patient_email: null,
        status: "pending"
      })
      .select("token")
      .single();

    if (error) {
      toast.error("Erro ao gerar convite.");
      console.error(error);
      setLoading(false);
      return;
    }

    onInvited?.();
    const link = `${window.location.origin}/auth?invite=${data.token}`;
    setInviteLink(link);
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setInviteLink("");
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Paciente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!inviteLink ? (
            <>
              <p className="text-sm text-muted-foreground">
                Gere um link de convite e envie para seu paciente. Ele podrá se cadastrar e será vinculado automaticamente.
              </p>
              <Button onClick={generateLink} className="w-full" disabled={loading}>
                {loading ? "Gerando..." : "Gerar Link de Convite"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{inviteLink}</span>
              </div>
              <Button onClick={copyLink} variant="outline" className="w-full gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Envie este link para seu paciente via WhatsApp, email ou qualquer aplicativo de mensagem.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitePatientDialog;