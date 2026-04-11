import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { Flame, Droplets, TrendingUp } from "lucide-react";


type Profile = Tables<"profiles">;
type WaterLog = Tables<"water_logs">;
type Meal = Tables<"meals">;

const PatientDetail = ({ patientId }: { patientId: string }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const [profileRes, waterRes, mealRes, respRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", patientId).single(),
        supabase.from("water_logs").select("*").eq("user_id", patientId).gte("logged_at", today).order("logged_at"),
        supabase.from("meals").select("*").eq("user_id", patientId).gte("logged_at", today).order("logged_at"),
        supabase.from("questionnaire_responses").select("*, questionnaire_questions(question_text), questionnaire_assignments!inner(patient_id)")
          .eq("questionnaire_assignments.patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (waterRes.data) setWaterLogs(waterRes.data);
      if (mealRes.data) setMeals(mealRes.data);
      if (respRes.data) setResponses(respRes.data);
    };
    fetch();
  }, [patientId, today]);

  const totalWaterMl = waterLogs.reduce((sum, l) => sum + l.amount_ml, 0);
  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0);
  const totalProtein = meals.reduce((sum, m) => sum + Number(m.protein), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + Number(m.carbs), 0);
  const totalFat = meals.reduce((sum, m) => sum + Number(m.fat), 0);

  const metaAgua = (profile?.meta_agua ?? 3) * 1000;
  const metaKcal = profile?.meta_kcal ?? 2000;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Patient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{profile?.full_name || "Paciente"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold text-foreground">{profile?.peso_atual}kg</p>
              <p className="text-xs text-muted-foreground">Peso</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold text-foreground">{profile?.altura}m</p>
              <p className="text-xs text-muted-foreground">Altura</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold text-foreground">{profile?.idade}</p>
              <p className="text-xs text-muted-foreground">Idade</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold text-foreground">{profile?.percentual_gordura}%</p>
              <p className="text-xs text-muted-foreground">Gordura</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="questionnaires">Respostas</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          {/* Today's calories */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-orange-500" />
                Calorias Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-foreground">{Math.round(totalCalories)}</span>
                <span className="text-sm text-muted-foreground">/ {metaKcal} kcal</span>
              </div>
              <Progress value={Math.min((totalCalories / metaKcal) * 100, 100)} className="h-3" />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-muted p-2">
                  <p className="text-sm font-bold text-blue-600">{Math.round(totalProtein)}g</p>
                  <p className="text-xs text-muted-foreground">Proteína</p>
                </div>
                <div className="rounded bg-muted p-2">
                  <p className="text-sm font-bold text-amber-600">{Math.round(totalCarbs)}g</p>
                  <p className="text-xs text-muted-foreground">Carbos</p>
                </div>
                <div className="rounded bg-muted p-2">
                  <p className="text-sm font-bold text-rose-500">{Math.round(totalFat)}g</p>
                  <p className="text-xs text-muted-foreground">Gordura</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's water */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-5 w-5 text-blue-500" />
                Água Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-foreground">{(totalWaterMl / 1000).toFixed(1)}L</span>
                <span className="text-sm text-muted-foreground">/ {profile?.meta_agua ?? 3}L</span>
              </div>
              <Progress value={Math.min((totalWaterMl / metaAgua) * 100, 100)} className="h-3" />
            </CardContent>
          </Card>

          {/* Today's meals list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Refeições</CardTitle>
            </CardHeader>
            <CardContent>
              {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma refeição hoje</p>
              ) : (
                <div className="space-y-2">
                  {meals.map((meal) => (
                    <div key={meal.id} className="rounded-lg border p-3">
                      <p className="font-medium text-sm text-foreground">{meal.meal_name || "Refeição"}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(Number(meal.calories))} kcal · P:{Math.round(Number(meal.protein))}g · C:{Math.round(Number(meal.carbs))}g · G:{Math.round(Number(meal.fat))}g
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução (em breve)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Gráficos de evolução de peso e composição corporal serão adicionados aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questionnaires" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Respostas dos Questionários</CardTitle>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta ainda.</p>
              ) : (
                <div className="space-y-2">
                  {responses.map((r: any) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-foreground">
                        {r.questionnaire_questions?.question_text || "Pergunta"}
                      </p>
                      <p className="text-sm text-primary font-bold">{r.response_value}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default PatientDetail;
