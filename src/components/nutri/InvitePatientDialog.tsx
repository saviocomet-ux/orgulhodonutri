import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Check, Link as LinkIcon, Send, User, Mail, Ruler, Weight, Calendar } from "lucide-react";

interface PatientData {
  full_name: string;
  email: string;
  altura: string;
  peso_atual: string;
  idade: string;
}

interface InvitePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

const InvitePatientDialog = ({ open, onOpenChange, onInvited }: InvitePatientDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [patientData, setPatientData] = useState<PatientData>({
    full_name: "",
    email: "",
    altura: "",
    peso_atual: "",
    idade: "",
  });
  const [sendEmail, setSendEmail] = useState(true);

  const generateLink = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("patient_invites")
      .insert({
        nutritionist_id: user.id,
        patient_email: patientData.email.toLowerCase().trim(),
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

    if (sendEmail) {
      setSendingEmail(true);
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        await supabase.functions.invoke("send-invite-email", {
          body: {
            email: patientData.email.toLowerCase().trim(),
            type: "patient",
            sender_name: profileData?.full_name || "Seu Nutricionista",
            invite_token: data.token
          },
        });
        toast.success("Convite enviado por-email!");
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        toast.error("Link gerado, mas falha ao enviar email.");
      }
      setSendingEmail(false);
    } else {
      toast.success("Link gerado com sucesso!");
    }

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
      setPatientData({
        full_name: "",
        email: "",
        altura: "",
        peso_atual: "",
        idade: "",
      });
    }
    onOpenChange(isOpen);
  };

  const isFormValid = () => {
    return (
      patientData.full_name.trim() !== "" &&
      patientData.email.trim() !== "" &&
      patientData.email.includes("@")
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Paciente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!inviteLink ? (
            <>
              <p className="text-sm text-muted-foreground">
                Preencha os dados do paciente para gerar o convite. Você pode adicionar dados antropométricos agora ou deixar para o paciente preencher.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      placeholder="Nome do paciente"
                      value={patientData.full_name}
                      onChange={(e) => setPatientData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={patientData.email}
                      onChange={(e) => setPatientData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="altura">Altura (m)</Label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="altura"
                        type="number"
                        step="0.01"
                        placeholder="1.70"
                        value={patientData.altura}
                        onChange={(e) => setPatientData(prev => ({ ...prev, altura: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="peso_atual">Peso (kg)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="peso_atual"
                        type="number"
                        step="0.1"
                        placeholder="70"
                        value={patientData.peso_atual}
                        onChange={(e) => setPatientData(prev => ({ ...prev, peso_atual: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="idade">Idade</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="idade"
                        type="number"
                        placeholder="25"
                        value={patientData.idade}
                        onChange={(e) => setPatientData(prev => ({ ...prev, idade: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
                    Enviar convite por e-mail automáticamente
                  </Label>
                </div>
              </div>

              <Button 
                onClick={generateLink} 
                className="w-full gap-2"
                disabled={loading || !isFormValid()}
              >
                {loading ? "Gerando..." : sendingEmail ? "Enviando..." : sendEmail ? <Send className="h-4 w-4" /> : null}
                {sendEmail ? "Gerar e Enviar Convite" : "Gerar Link de Convite"}
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