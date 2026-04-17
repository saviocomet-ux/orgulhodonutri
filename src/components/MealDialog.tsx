import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenFoodFactsSearch } from "./food/OpenFoodFactsSearch";

interface MealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealAdded: () => void;
}

const MealDialog = ({ open, onOpenChange, onMealAdded }: MealDialogProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const resetForm = () => {
    setImagePreview(null);
    setImageBase64(null);
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setAnalyzed(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: { image: imageBase64 },
      });

      if (error) throw error;

      if (data) {
        setMealName(data.meal_name || "Refeição");
        setCalories(String(data.calories || 0));
        setProtein(String(data.protein || 0));
        setCarbs(String(data.carbs || 0));
        setFat(String(data.fat || 0));
        setAnalyzed(true);
        toast.success("Refeição analisada pela IA!");
      }
    } catch (err: any) {
      console.error("Analyze error:", err);
      toast.error("Erro ao analisar a imagem. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!user) return;

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      meal_name: mealName || "Refeição",
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    });

    if (error) {
      toast.error("Erro ao salvar refeição");
    } else {
      toast.success("Refeição registrada!");
      resetForm();
      onMealAdded();
      onOpenChange(false);
    }
  };

  const handleManualSave = async () => {
    if (!calories) {
      toast.error("Informe ao menos as calorias");
      return;
    }
    await saveMeal();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Refeição</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai">Análise com IA</TabsTrigger>
              <TabsTrigger value="search">Banco de Alimentos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai" className="space-y-4 mt-4">
              {/* Image Upload */}
              {!imagePreview ? (
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Tire uma foto ou selecione uma imagem</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Refeição"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {!analyzed && (
                    <Button
                      className="w-full"
                      onClick={analyzeImage}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analisando com IA...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Analisar com IA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="search" className="mt-4">
              <OpenFoodFactsSearch onSelect={(item) => {
                setMealName(item.name);
                setCalories(String(item.calories));
                setProtein(String(item.protein));
                setCarbs(String(item.carbs));
                setFat(String(item.fat));
                toast.success("Alimento selecionado!");
              }} />
            </TabsContent>
          </Tabs>

          {/* Manual / Analyzed fields */}
          <div>
            <Label>Nome da refeição</Label>
            <Input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Ex: Almoço" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Calorias (kcal)</Label>
              <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div>
              <Label>Proteína (g)</Label>
              <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Carbos (g)</Label>
              <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div>
              <Label>Gordura (g)</Label>
              <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={handleManualSave}>
            Salvar Refeição
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MealDialog;
