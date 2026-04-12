import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface EvolutionChartsProps {
  patientId: string;
}

const EvolutionCharts = ({ patientId }: EvolutionChartsProps) => {
  const [period, setPeriod] = useState("30");
  const [weightData, setWeightData] = useState<any[]>([]);
  const [calorieData, setCalorieData] = useState<any[]>([]);
  const [waterData, setWaterData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      const since = daysAgo.toISOString();

      const [weightRes, mealRes, waterRes] = await Promise.all([
        supabase
          .from("weight_logs")
          .select("weight_kg, body_fat_percent, logged_at")
          .eq("user_id", patientId)
          .gte("logged_at", since)
          .order("logged_at"),
        supabase
          .from("meals")
          .select("calories, protein, carbs, fat, logged_at")
          .eq("user_id", patientId)
          .gte("logged_at", since)
          .order("logged_at"),
        supabase
          .from("water_logs")
          .select("amount_ml, logged_at")
          .eq("user_id", patientId)
          .gte("logged_at", since)
          .order("logged_at"),
      ]);

      // Weight data
      setWeightData(
        (weightRes.data || []).map((w) => ({
          date: new Date(w.logged_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          peso: Number(w.weight_kg),
          gordura: w.body_fat_percent ? Number(w.body_fat_percent) : null,
        }))
      );

      // Aggregate meals by day
      const mealsByDay: Record<string, { cal: number; prot: number; carbs: number; fat: number }> = {};
      (mealRes.data || []).forEach((m) => {
        const day = new Date(m.logged_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (!mealsByDay[day]) mealsByDay[day] = { cal: 0, prot: 0, carbs: 0, fat: 0 };
        mealsByDay[day].cal += Number(m.calories);
        mealsByDay[day].prot += Number(m.protein);
        mealsByDay[day].carbs += Number(m.carbs);
        mealsByDay[day].fat += Number(m.fat);
      });
      setCalorieData(
        Object.entries(mealsByDay).map(([date, v]) => ({
          date,
          calorias: Math.round(v.cal),
          proteína: Math.round(v.prot),
          carbos: Math.round(v.carbs),
          gordura: Math.round(v.fat),
        }))
      );

      // Aggregate water by day
      const waterByDay: Record<string, number> = {};
      (waterRes.data || []).forEach((w) => {
        const day = new Date(w.logged_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        waterByDay[day] = (waterByDay[day] || 0) + w.amount_ml;
      });
      setWaterData(
        Object.entries(waterByDay).map(([date, ml]) => ({
          date,
          litros: Number((ml / 1000).toFixed(1)),
        }))
      );
    };

    fetchData();
  }, [patientId, period]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução
        </h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Weight Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Peso & Gordura Corporal</CardTitle>
        </CardHeader>
        <CardContent>
          {weightData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de peso no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="peso" stroke="hsl(var(--primary))" name="Peso (kg)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="gordura" stroke="#f43f5e" name="Gordura (%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Calories Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calorias Diárias</CardTitle>
        </CardHeader>
        <CardContent>
          {calorieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma refeição no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calorieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calorias" stroke="#f97316" name="Calorias" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="proteína" stroke="#3b82f6" name="Proteína (g)" strokeWidth={1.5} />
                <Line type="monotone" dataKey="carbos" stroke="#f59e0b" name="Carbos (g)" strokeWidth={1.5} />
                <Line type="monotone" dataKey="gordura" stroke="#f43f5e" name="Gordura (g)" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Water Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Água Diária</CardTitle>
        </CardHeader>
        <CardContent>
          {waterData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de água no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={waterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="litros" stroke="#3b82f6" name="Litros" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EvolutionCharts;
