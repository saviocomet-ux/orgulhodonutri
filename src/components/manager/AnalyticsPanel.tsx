import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { Users, UserCheck, TrendingUp, BarChart3, Loader2 } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export const AnalyticsPanel = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [
        profilesRes,
        linksRes,
        mealsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("role, created_at"),
        supabase.from("nutritionist_patients").select("id, nutritionist_id, created_at"),
        supabase.from("meals").select("id, created_at"),
      ]);

      const profiles = profilesRes.data || [];
      const links = linksRes.data || [];
      const meals = mealsRes.data || [];

      // Cálculo de Totais
      const totalNutris = profiles.filter(p => p.role === "admin").length;
      const totalPatients = profiles.filter(p => p.role === "patient").length;
      
      // Crescimento (Últimos 7 dias)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split("T")[0];
        
        return {
          name: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          patients: profiles.filter(p => p.role === "patient" && p.created_at.startsWith(dateStr)).length,
          nutris: profiles.filter(p => p.role === "admin" && p.created_at.startsWith(dateStr)).length,
        };
      });

      // Engajamento de Refeições
      const mealEngagement = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split("T")[0];
        return {
          name: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          count: meals.filter(m => m.created_at.startsWith(dateStr)).length,
        };
      });

      setStats({
        totalNutris,
        totalPatients,
        growthData: last7Days,
        engagementData: mealEngagement,
        pieData: [
          { name: "Nutris", value: totalNutris },
          { name: "Pacientes", value: totalPatients },
        ]
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Nutricionistas</p>
                <p className="text-2xl font-bold">{stats.totalNutris}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full text-orange-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Crescimento Semanal</p>
                <p className="text-2xl font-bold">
                  +{stats.growthData.reduce((s: number, d: any) => s + d.patients + d.nutris, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Adesão de Novos Usuários (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="patients" name="Pacientes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nutris" name="Nutris" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Engajamento (Refeições Diárias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.engagementData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                   itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="count" name="Refeições" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição da Base</CardTitle>
          <CardDescription>Proporção entre Nutricionistas e Pacientes</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
               <span className="text-sm text-muted-foreground uppercase text-[10px] font-bold">Total</span>
               <span className="text-xl font-bold">{stats.totalNutris + stats.totalPatients}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
