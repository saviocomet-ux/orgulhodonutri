import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSaved: () => void;
}

const EditPatientDialog = ({ open, onOpenChange, profile, onSaved }: Props) => {
  const [form, setForm] = useState({
    full_name: "",
    peso_atual: 70,
    altura: 1.7,
    idade: 25,
    percentual_gordura: 20,
    meta_kcal: 2000,
    meta_agua: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        peso_atual: Number(profile.peso_atual),
        altura: Number(profile.altura),
        idade: profile.idade,
        percentual_gordura: Number(profile.percentual_gordura),
        meta_kcal: profile.meta_kcal,
        meta_agua: Number(profile.meta_agua),
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(form)
      .eq("user_id", profile.user_id);

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Dados atualizados!");
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const fields = [
    { key: "full_name", label: "Nome", type: "text" },
    { key: "peso_atual", label: "Peso (kg)", type: "number", step: "0.1" },
    { key: "altura", label: "Altura (m)", type: "number", step: "0.01" },
    { key: "idade", label: "Idade", type: "number" },
    { key: "percentual_gordura", label: "% Gordura", type: "number", step: "0.1" },
    { key: "meta_kcal", label: "Meta Calorias (kcal)", type: "number" },
    { key: "meta_agua", label: "Meta Água (L)", type: "number", step: "0.1" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliação Física</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-sm">{f.label}</Label>
              <Input
                type={f.type}
                step={"step" in f ? f.step : undefined}
                value={form[f.key as keyof typeof form]}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })
                }
              />
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientDialog;
