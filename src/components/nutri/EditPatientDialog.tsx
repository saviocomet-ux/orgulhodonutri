import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    birth_date: "",
    sex: "M",
    activity_level: "sedentary",
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
        birth_date: (profile as any).birth_date || "",
        sex: (profile as any).sex || "M",
        activity_level: (profile as any).activity_level || "sedentary",
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
        <div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
          <div className="space-y-1">
            <Label className="text-sm">Nome Completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Data de Nascimento</Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Sexo</Label>
              <Select 
                value={form.sex} 
                onValueChange={(v) => setForm({ ...form, sex: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="Other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.peso_atual}
                onChange={(e) => setForm({ ...form, peso_atual: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Altura (m)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.altura}
                onChange={(e) => setForm({ ...form, altura: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Nível de Atividade</Label>
            <Select 
              value={form.activity_level} 
              onValueChange={(v) => setForm({ ...form, activity_level: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentário</SelectItem>
                <SelectItem value="lightly_active">Levemente Ativo</SelectItem>
                <SelectItem value="moderately_active">Moderadamente Ativo</SelectItem>
                <SelectItem value="very_active">Muito Ativo</SelectItem>
                <SelectItem value="extra_active">Extremamente Ativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">% Gordura</Label>
              <Input
                type="number"
                step="0.1"
                value={form.percentual_gordura}
                onChange={(e) => setForm({ ...form, percentual_gordura: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Meta Água (L)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.meta_agua}
                onChange={(e) => setForm({ ...form, meta_agua: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Meta Calorias (kcal)</Label>
            <Input
              type="number"
              value={form.meta_kcal}
              onChange={(e) => setForm({ ...form, meta_kcal: Number(e.target.value) })}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
            {saving ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientDialog;
