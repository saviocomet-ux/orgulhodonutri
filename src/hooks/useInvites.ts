import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export const useInviteCodes = ({ page = 1, pageSize = 10 }: PaginationParams = {}) => {
  return useQuery({
    queryKey: ["invite_codes", page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("invite_codes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    meta: { errorMessage: "Erro ao carregar convites" },
  });
};

export const useManagerMutations = () => {
  const queryClient = useQueryClient();

  const createInvite = useMutation({
    mutationFn: async (email?: string) => {
      const { data, error } = await supabase.from("invite_codes").insert({
        email: email ? email.trim().toLowerCase() : null,
      }).select("id").single();
      
      if (error) throw error;

      if (email) {
        await supabase.functions.invoke("send-invite-email", {
          body: { 
            email: email.trim().toLowerCase(), 
            type: "nutri" 
          },
        });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invite_codes"] });
      toast.success("Convite criado com sucesso!");
    },
    meta: { errorMessage: "Erro ao convidar nutricionista" },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invite_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invite_codes"] });
      toast.success("Código excluído com sucesso!");
    },
    meta: { errorMessage: "Erro ao excluir código" },
  });

  const resendInvite = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: { 
          email: email.trim().toLowerCase(), 
          type: "nutri" 
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso!");
    },
    meta: { errorMessage: "Erro ao reenviar convite" },
  });

  return { createInvite, deleteInvite, resendInvite };
};

export const usePatientInvites = ({ nutriId, page = 1, pageSize = 10 }: { nutriId?: string } & PaginationParams) => {
  return useQuery({
    queryKey: ["patient_invites", nutriId, page, pageSize],
    queryFn: async () => {
      if (!nutriId) return { data: [], count: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("patient_invites")
        .select("id, patient_email, created_at", { count: "exact" })
        .eq("nutritionist_id", nutriId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!nutriId,
    meta: { errorMessage: "Erro ao carregar convites de pacientes" },
  });
};

export const usePatientInviteMutations = () => {
  const queryClient = useQueryClient();

  const resendInvite = useMutation({
    mutationFn: async ({ email, senderName }: { email: string, senderName: string }) => {
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: { 
          email, 
          type: "patient",
          sender_name: senderName
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso!");
    },
    meta: { errorMessage: "Erro ao reenviar convite" },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_invites")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient_invites"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Convite cancelado!");
    },
    meta: { errorMessage: "Erro ao cancelar convite" },
  });

  return { resendInvite, deleteInvite };
};
