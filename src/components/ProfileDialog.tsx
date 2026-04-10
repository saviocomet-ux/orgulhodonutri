import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const ProfileDialog = ({ open, onOpenChange, onSaved }: ProfileDialogProps) => {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [altura, setAltura] = useState("");
  const [idade, setIdade] = useState("");
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const [metaKcal, setMetaKcal] = useState("");
  const [metaAgua, setMetaAgua] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAltura(String(profile.altura));
      setIdade(String(profile.idade));
      setPeso(String(profile.peso_atual));
      setGordura(String(profile.percentual_gordura));
      setMetaKcal(String(profile.meta_kcal));
      setMetaAgua(String(profile.meta_agua));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        altura: parseFloat(altura),
        idade: parseInt(idade),
        peso_atual: parseFloat(peso),
        percentual_gordura: parseFloat(gordura),
        meta_kcal: parseInt(metaKcal),
        meta_agua: parseFloat(metaAgua),
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Altura (m)</Label>
              <Input type="number" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} />
            </div>
            <div>
              <Label>Idade</Label>
              <Input type="number" value={idade} onChange={(e) => setIdade(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Peso atual (kg)</Label>
              <Input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
            <div>
              <Label>% Gordura</Label>
              <Input type="number" step="0.1" value={gordura} onChange={(e) => setGordura(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meta Kcal/dia</Label>
              <Input type="number" value={metaKcal} onChange={(e) => setMetaKcal(e.target.value)} />
            </div>
            <div>
              <Label>Meta Água (L)</Label>
              <Input type="number" step="0.1" value={metaAgua} onChange={(e) => setMetaAgua(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
