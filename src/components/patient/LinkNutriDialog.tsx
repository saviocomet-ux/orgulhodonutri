import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface LinkNutriDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LinkNutriDialog = ({ open, onOpenChange }: LinkNutriDialogProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);

    // Find nutritionist with this link code
    const { data: nutriProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("link_code", code.trim().toUpperCase())
      .single();

    if (!nutriProfile) {
      toast.error("Código de vínculo não encontrado.");
      setLoading(false);
      return;
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from("nutritionist_patients")
      .select("id")
      .eq("nutritionist_id", nutriProfile.user_id)
      .eq("patient_id", user.id)
      .maybeSingle();

    if (existing) {
      toast.info("Você já está vinculado a este nutricionista.");
      setLoading(false);
      onOpenChange(false);
      return;
    }

    const { error } = await supabase.from("nutritionist_patients").insert({
      nutritionist_id: nutriProfile.user_id,
      patient_id: user.id,
      link_code: code.trim().toUpperCase(),
    });

    if (error) {
      toast.error("Erro ao vincular. Tente novamente.");
    } else {
      toast.success("Vinculado ao nutricionista com sucesso!");
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Nutricionista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite o código fornecido pelo seu nutricionista para se vincular.
          </p>
          <Input
            placeholder="Código de vínculo"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center font-mono text-lg tracking-widest uppercase"
          />
          <Button onClick={handleLink} className="w-full" disabled={loading || !code.trim()}>
            {loading ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkNutriDialog;
