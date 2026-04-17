import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PatientSummary {
  link_id: string;
  nutritionist_id: string;
  patient_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  meta_agua: number | null;
  meals_today_count: number;
  water_today_amount: number;
  pending_questions_count: number;
  completed_questions_count: number;
  linked_at: string;
}

interface UsePatientsOptions {
  nutriId?: string;
  page?: number;
  pageSize?: number;
}

export const usePatients = ({ nutriId, page = 1, pageSize = 10 }: UsePatientsOptions) => {
  return useQuery({
    queryKey: ["patients", nutriId, page, pageSize],
    queryFn: async () => {
      if (!nutriId) return { data: [] as PatientSummary[], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Usando a View otimizada que criamos via migração
      const { data, computeCount, error, count } = await supabase
        .from("patient_summary")
        .select("*", { count: "exact" })
        .eq("nutritionist_id", nutriId)
        .order("linked_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: (data || []) as PatientSummary[],
        count: count || 0,
      };
    },
    enabled: !!nutriId,
    meta: { errorMessage: "Erro ao carregar pacientes" },
  });
};
