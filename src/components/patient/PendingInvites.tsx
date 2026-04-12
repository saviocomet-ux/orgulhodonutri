import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const PendingInvites = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<any[]>([]);

  const fetchInvites = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("patient_invites")
      .select("*, profiles!patient_invites_nutritionist_id_fkey(full_name)")
      .eq("patient_email", user.email.toLowerCase())
      .eq("status", "pending");

    // fallback: get nutri names manually
    if (data && data.length > 0) {
      const nutriIds = data.map((d: any) => d.nutritionist_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", nutriIds);

      const enriched = data.map((inv: any) => ({
        ...inv,
        nutri_name: profiles?.find((p) => p.user_id === inv.nutritionist_id)?.full_name || "Nutricionista",
      }));
      setInvites(enriched);
    } else {
      setInvites([]);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [user]);

  const respond = async (inviteId: string, nutriId: string, accept: boolean) => {
    if (!user) return;

    // Update invite status
    await supabase
      .from("patient_invites")
      .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (accept) {
      // Check if already linked
      const { data: existing } = await supabase
        .from("nutritionist_patients")
        .select("id")
        .eq("nutritionist_id", nutriId)
        .eq("patient_id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("nutritionist_patients").insert({
          nutritionist_id: nutriId,
          patient_id: user.id,
          link_code: "EMAIL_INVITE",
        });
      }
      toast.success("Vinculado ao nutricionista com sucesso!");
    } else {
      toast.info("Convite recusado.");
    }
    fetchInvites();
  };

  if (invites.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Convites pendentes</p>
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">{inv.nutri_name}</p>
              <p className="text-xs text-muted-foreground">quer vincular você como paciente</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => respond(inv.id, inv.nutritionist_id, true)}>
                <Check className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => respond(inv.id, inv.nutritionist_id, false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingInvites;
