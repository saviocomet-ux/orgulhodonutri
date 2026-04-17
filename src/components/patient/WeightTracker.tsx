import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TrendingUp, Scale, Plus, History } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeightLog {
  id: string;
  weight: number;
  logged_at: string;
}

export const WeightTracker = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchLogs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true });

    if (error) {
      console.error("Error fetching weight logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const addWeight = async () => {
    if (!user || !newWeight) return;
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal)) return;

    const { error } = await supabase.from("weight_logs").insert({
      user_id: user.id,
      weight: weightVal,
    });

    if (error) {
      toast.error("Erro ao registrar peso");
    } else {
      toast.success("Peso registrado!");
      setNewWeight("");
      fetchLogs();
    }
  };

  const chartData = logs.map((log) => ({
    date: format(new Date(log.logged_at), "dd/MM"),
    weight: log.weight,
  }));

  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-green-600" />
            Meu Peso
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? <TrendingUp className="h-4 w-4" /> : <History className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!showHistory ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold">{latestWeight || "--"}</span>
                <span className="ml-1 text-sm text-muted-foreground font-medium">kg</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Novo peso"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-24 h-9"
                />
                <Button size="sm" onClick={addWeight}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {logs.length > 1 && (
              <div className="h-[120px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      hide 
                      domain={['dataMin - 2', 'dataMax + 2']} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontSize: '10px', color: '#666' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#16a34a" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                <span className="text-muted-foreground">
                  {format(new Date(log.logged_at), "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <span className="font-bold">{log.weight} kg</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
