import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface WeightLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const WeightLogDialog = ({ open, onOpenChange, onSaved }: WeightLogDialogProps) => {
  const { user, profile } = useAuth();
  const [weight, setWeight] = useState(profile?.peso_atual?.toString() || "");
  const [bodyFat, setBodyFat] = useState(profile?.percentual_gordura?.toString() || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user || !weight.trim()) return;
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 500) {
      toast.error("Peso inválido.");
      return;
    }
    const bf = bodyFat.trim() ? parseFloat(bodyFat) : null;
    if (bf !== null && (isNaN(bf) || bf < 0 || bf > 100)) {
      toast.error("% de gordura inválido.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("weight_logs").insert({
      user_id: user.id,
      weight_kg: w,
      body_fat_percent: bf,
    });

    if (error) {
      toast.error("Erro ao registrar.");
    } else {
      // Also update profile with latest values
      await supabase.from("profiles").update({
        peso_atual: w,
        ...(bf !== null ? { percentual_gordura: bf } : {}),
      }).eq("user_id", user.id);

      toast.success("Peso registrado!");
      onOpenChange(false);
      onSaved?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Peso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Peso (kg) *</label>
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">% Gordura corporal (opcional)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 18.5"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={loading || !weight.trim()}>
            {loading ? "Salvando..." : "Registrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeightLogDialog;
