import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Clock, FileText, GripVertical } from "lucide-react";

interface MealPlanItem {
  id?: string;
  meal_name: string;
  scheduled_time: string;
  foods: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
  display_order: number;
}

interface MealPlan {
  id: string;
  title: string;
  pdf_url: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyItem = (): MealPlanItem => ({
  meal_name: "",
  scheduled_time: "08:00",
  foods: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  notes: "",
  display_order: 0,
});

const MealPlanManager = ({ patientId }: { patientId: string }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("Plano Alimentar");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user!.id)
      .order("created_at", { ascending: false });
    setPlans((data as MealPlan[]) || []);
  };

  useEffect(() => {
    if (user) fetchPlans();
  }, [user, patientId]);

  const openPlan = async (plan: MealPlan) => {
    setActivePlan(plan);
    setTitle(plan.title);
    const { data } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("plan_id", plan.id)
      .order("display_order");
    setItems((data as MealPlanItem[]) || []);
    setEditOpen(true);
  };

  const createNewPlan = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("meal_plans")
      .insert({ patient_id: patientId, nutritionist_id: user.id, title: "Novo Plano" })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar plano");
      return;
    }
    const plan = data as MealPlan;
    setActivePlan(plan);
    setTitle(plan.title);
    setItems([emptyItem()]);
    setEditOpen(true);
    fetchPlans();
  };

  const uploadPdf = async (file: File) => {
    if (!activePlan || !user) return;
    setUploading(true);
    const path = `${user.id}/${activePlan.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("meal-plans")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar PDF");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("meal-plans").getPublicUrl(path);
    await supabase
      .from("meal_plans")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", activePlan.id);
    setActivePlan({ ...activePlan, pdf_url: urlData.publicUrl });
    toast.success("PDF enviado!");
    setUploading(false);
    fetchPlans();
  };

  const saveItems = async () => {
    if (!activePlan) return;
    setSaving(true);

    // Update title
    await supabase.from("meal_plans").update({ title }).eq("id", activePlan.id);

    // Delete existing items and re-insert
    await supabase.from("meal_plan_items").delete().eq("plan_id", activePlan.id);

    const toInsert = items
      .filter((i) => i.meal_name.trim())
      .map((i, idx) => ({
        plan_id: activePlan.id,
        meal_name: i.meal_name,
        scheduled_time: i.scheduled_time,
        foods: i.foods,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        notes: i.notes || null,
        display_order: idx,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("meal_plan_items").insert(toInsert);
      if (error) {
        toast.error("Erro ao salvar itens");
        setSaving(false);
        return;
      }
    }

    toast.success("Plano salvo!");
    setSaving(false);
    fetchPlans();
  };

  const updateItem = (index: number, field: keyof MealPlanItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { ...emptyItem(), display_order: items.length }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Planos Alimentares</h3>
        <Button size="sm" onClick={createNewPlan}>
          <Plus className="h-4 w-4 mr-1" /> Novo Plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum plano criado ainda.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => openPlan(plan)}
              className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-sm text-foreground">{plan.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(plan.created_at).toLocaleDateString("pt-BR")}</span>
                  {plan.pdf_url && <FileText className="h-3 w-3" />}
                </div>
              </div>
              {plan.is_active && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Ativo</span>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* PDF upload */}
            <div className="space-y-1">
              <Label>PDF do plano</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="relative" disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? "Enviando..." : "Enviar PDF"}
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])}
                  />
                </Button>
                {activePlan?.pdf_url && (
                  <a
                    href={activePlan.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Ver PDF
                  </a>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Refeições</Label>
              {items.map((item, idx) => (
                <Card key={idx} className="relative">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Nome da refeição"
                        value={item.meal_name}
                        onChange={(e) => updateItem(idx, "meal_name", e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={item.scheduled_time}
                          onChange={(e) => updateItem(idx, "scheduled_time", e.target.value)}
                          className="w-28"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Alimentos (ex: 2 ovos, 1 fatia pão integral, 200ml leite)"
                      value={item.foods}
                      onChange={(e) => updateItem(idx, "foods", e.target.value)}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Kcal</Label>
                        <Input
                          type="number"
                          value={item.calories || ""}
                          onChange={(e) => updateItem(idx, "calories", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Prot (g)</Label>
                        <Input
                          type="number"
                          value={item.protein || ""}
                          onChange={(e) => updateItem(idx, "protein", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Carb (g)</Label>
                        <Input
                          type="number"
                          value={item.carbs || ""}
                          onChange={(e) => updateItem(idx, "carbs", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Gord (g)</Label>
                        <Input
                          type="number"
                          value={item.fat || ""}
                          onChange={(e) => updateItem(idx, "fat", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <Input
                      placeholder="Observações (opcional)"
                      value={item.notes || ""}
                      onChange={(e) => updateItem(idx, "notes", e.target.value)}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Refeição
              </Button>
            </div>

            <Button onClick={saveItems} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Plano"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealPlanManager;
