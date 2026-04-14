import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Clock, FileText, ExternalLink } from "lucide-react";

interface MealPlanItem {
  id: string;
  meal_name: string;
  scheduled_time: string;
  foods: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  display_order: number;
}

interface MealPlan {
  id: string;
  title: string;
  pdf_url: string | null;
  is_active: boolean;
}

const MealPlanView = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: plans } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("patient_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!plans || plans.length === 0) return;
      const activePlan = plans[0] as MealPlan;
      setPlan(activePlan);

      const { data: planItems } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("plan_id", activePlan.id)
        .order("display_order");
      setItems((planItems as MealPlanItem[]) || []);
    };
    fetch();
  }, [user]);

  if (!plan) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-5 w-5 text-green-600" />
            {plan.title}
          </CardTitle>
          {plan.pdf_url && (
            <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> PDF
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {plan.pdf_url ? "Plano disponível em PDF acima." : "Nenhuma refeição no plano."}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{item.meal_name}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {item.scheduled_time.slice(0, 5)}
                  </span>
                </div>
                {item.foods && (
                  <p className="text-sm text-foreground mb-1">{item.foods}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {Math.round(Number(item.calories))} kcal · P:{Math.round(Number(item.protein))}g · C:{Math.round(Number(item.carbs))}g · G:{Math.round(Number(item.fat))}g
                </p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MealPlanView;
