import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Droplets, Flame, LogOut, User, Plus, Camera, Trash2, Link } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import MealDialog from "@/components/MealDialog";
import ProfileDialog from "@/components/ProfileDialog";
import LinkNutriDialog from "@/components/patient/LinkNutriDialog";
import QuestionnaireList from "@/components/patient/QuestionnaireList";

type WaterLog = Tables<"water_logs">;
type Meal = Tables<"meals">;

const Dashboard = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const fetchTodayData = async () => {
    if (!user) return;
    const [waterRes, mealRes] = await Promise.all([
      supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", today)
        .order("logged_at", { ascending: false }),
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", today)
        .order("logged_at", { ascending: false }),
    ]);
    if (waterRes.data) setWaterLogs(waterRes.data);
    if (mealRes.data) setMeals(mealRes.data);
  };

  useEffect(() => {
    fetchTodayData();
  }, [user, today]);

  const totalWaterMl = waterLogs.reduce((sum, l) => sum + l.amount_ml, 0);
  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0);
  const totalProtein = meals.reduce((sum, m) => sum + Number(m.protein), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + Number(m.carbs), 0);
  const totalFat = meals.reduce((sum, m) => sum + Number(m.fat), 0);

  const metaAgua = (profile?.meta_agua ?? 3) * 1000;
  const metaKcal = profile?.meta_kcal ?? 2000;

  const waterPercent = Math.min((totalWaterMl / metaAgua) * 100, 100);
  const caloriePercent = Math.min((totalCalories / metaKcal) * 100, 100);

  const addWater = async (amount: number) => {
    if (!user) return;
    const { error } = await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: amount,
    });
    if (error) {
      toast.error("Erro ao registrar água");
    } else {
      toast.success(`+${amount}ml registrado!`);
      fetchTodayData();
    }
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover refeição");
    } else {
      fetchTodayData();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">NutriTrack</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setLinkDialogOpen(true)} title="Vincular nutricionista">
              <Link className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setProfileDialogOpen(true)}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-muted-foreground">
          Olá, <span className="font-medium text-foreground">{profile?.full_name || "Paciente"}</span>
        </p>

        {/* Calories Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-orange-500" />
              Calorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-foreground">{Math.round(totalCalories)}</span>
              <span className="text-sm text-muted-foreground">/ {metaKcal} kcal</span>
            </div>
            <Progress value={caloriePercent} className="h-3" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MacroCard label="Proteína" value={totalProtein} unit="g" color="text-blue-600" />
              <MacroCard label="Carbos" value={totalCarbs} unit="g" color="text-amber-600" />
              <MacroCard label="Gordura" value={totalFat} unit="g" color="text-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* Water Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-5 w-5 text-blue-500" />
              Água
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-foreground">
                {(totalWaterMl / 1000).toFixed(1)}L
              </span>
              <span className="text-sm text-muted-foreground">/ {profile?.meta_agua ?? 3}L</span>
            </div>
            <Progress value={waterPercent} className="h-3" />
            <div className="mt-4 flex gap-2">
              {[250, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => addWater(amount)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meals */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Refeições de hoje</CardTitle>
              <Button size="sm" onClick={() => setMealDialogOpen(true)}>
                <Camera className="h-4 w-4 mr-1" />
                Registrar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {meals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma refeição registrada hoje
              </p>
            ) : (
              <div className="space-y-3">
                {meals.map((meal) => (
                  <div key={meal.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">{meal.meal_name || "Refeição"}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(Number(meal.calories))} kcal · P:{Math.round(Number(meal.protein))}g · C:{Math.round(Number(meal.carbs))}g · G:{Math.round(Number(meal.fat))}g
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMeal(meal.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questionnaires */}
        <QuestionnaireList />
      </main>

      <MealDialog open={mealDialogOpen} onOpenChange={setMealDialogOpen} onMealAdded={fetchTodayData} />
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} onSaved={refreshProfile} />
      <LinkNutriDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
    </div>
  );
};

const MacroCard = ({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) => (
  <div className="rounded-lg bg-muted p-3 text-center">
    <p className={`text-lg font-bold ${color}`}>{Math.round(value)}{unit}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default Dashboard;
