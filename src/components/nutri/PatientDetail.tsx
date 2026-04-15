import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { Flame, Droplets, Pencil, BellRing, Activity } from "lucide-react";
import { toast } from "sonner";
import EvolutionCharts from "@/components/nutri/EvolutionCharts";
import EditPatientDialog from "@/components/nutri/EditPatientDialog";
import MealPlanManager from "@/components/nutri/MealPlanManager";

type Profile = Tables<"profiles">;
type WaterLog = Tables<"water_logs">;
type Meal = Tables<"meals">;

const getScoreColor = (value: number) => {
  if (value <= 3) return "bg-red-500";
  if (value <= 5) return "bg-orange-400";
  if (value <= 7) return "bg-yellow-400";
  if (value <= 8) return "bg-lime-400";
  return "bg-green-500";
};

const getScoreTextColor = (value: number) => {
  if (value <= 3) return "text-red-600";
  if (value <= 5) return "text-orange-500";
  if (value <= 7) return "text-yellow-600";
  if (value <= 8) return "text-lime-600";
  return "text-green-600";
};

const ScoreIndicator = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`h-3 w-2 rounded-sm ${i < value ? getScoreColor(value) : "bg-muted"}`}
        />
      ))}
    </div>
    <span className={`text-sm font-bold ${getScoreTextColor(value)}`}>{value}/10</span>
  </div>
);

const PatientDetail = ({ patientId }: { patientId: string }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);

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
        supabase.from("questionnaire_responses").select("*, questionnaire_questions(question_text, question_type), questionnaire_assignments!inner(patient_id, created_at, questionnaire_templates(title))")
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

  // Group responses by assignment
  const groupedResponses = useMemo(() => {
    const groups: Record<string, { title: string; date: string; items: any[] }> = {};
    responses.forEach((r: any) => {
      const assignmentId = r.assignment_id;
      if (!groups[assignmentId]) {
        groups[assignmentId] = {
          title: r.questionnaire_assignments?.questionnaire_templates?.title || "Questionário",
          date: r.questionnaire_assignments?.created_at || r.created_at,
          items: [],
        };
      }
      groups[assignmentId].items.push(r);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [responses]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Patient Info */}
      <Card className="border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">{profile?.full_name || "Paciente"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Activity className="h-4 w-4 text-green-500" /> Última atividade: Hoje
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="hidden sm:flex bg-background" onClick={() => toast.success("Lembrete de hidratação enviado com sucesso!")}>
                <BellRing className="h-4 w-4 mr-2" /> Lembrete 
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center mb-4">
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-xl font-bold text-foreground">{profile?.peso_atual}kg</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Peso Atual</p>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-xl font-bold text-foreground">{profile?.altura}m</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Altura</p>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-xl font-bold text-foreground">{profile?.idade}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Idade</p>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-xl font-bold text-primary">{profile?.percentual_gordura}%</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">BF / Gordura</p>
            </div>
          </div>
          
          <div className="sm:hidden mt-2 flex gap-2">
             <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success("Lembrete enviado ao paciente!")}>
                <BellRing className="h-4 w-4 mr-2" /> Alertar Água
              </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="mealplan">Plano</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="questionnaires">Respostas</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
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
          <EvolutionCharts patientId={patientId} />
        </TabsContent>

        <TabsContent value="questionnaires" className="mt-4 space-y-4">
          {groupedResponses.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">Nenhuma resposta ainda.</p>
              </CardContent>
            </Card>
          ) : (
            groupedResponses.map((group, gi) => (
              <Card key={gi}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {new Date(group.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.items.map((r: any) => {
                      const isScale = r.questionnaire_questions?.question_type === "scale";
                      const numValue = Number(r.response_value);
                      return (
                        <div key={r.id} className="rounded-lg border p-3">
                          <p className="text-sm font-medium text-foreground mb-1">
                            {r.questionnaire_questions?.question_text || "Pergunta"}
                          </p>
                          {isScale && !isNaN(numValue) ? (
                            <ScoreIndicator value={Math.min(Math.max(numValue, 1), 10)} />
                          ) : (
                            <p className="text-sm text-primary font-bold">{r.response_value}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        <TabsContent value="mealplan" className="mt-4">
          <MealPlanManager patientId={patientId} />
        </TabsContent>
      </Tabs>

      <EditPatientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSaved={() => {
          // refetch profile
          supabase.from("profiles").select("*").eq("user_id", patientId).single().then(({ data }) => {
            if (data) setProfile(data);
          });
        }}
      />
    </main>
  );
};

export default PatientDetail;
