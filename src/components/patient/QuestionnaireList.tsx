import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Check } from "lucide-react";

interface Assignment {
  id: string;
  template_id: string;
  status: string;
  created_at: string;
  template?: { title: string; description: string | null };
  questions?: Question[];
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  display_order: number;
}

const QuestionnaireList = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const fetchAssignments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("questionnaire_assignments")
      .select("*, questionnaire_templates(title, description)")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) return;

    const enriched: Assignment[] = data.map((a: any) => ({
      ...a,
      template: a.questionnaire_templates,
    }));
    setAssignments(enriched);
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const openQuestionnaire = async (assignment: Assignment) => {
    const { data: questions } = await supabase
      .from("questionnaire_questions")
      .select("*")
      .eq("template_id", assignment.template_id)
      .order("display_order");

    setActiveAssignment({ ...assignment, questions: questions || [] });
    setAnswers({});
  };

  const submitResponses = async () => {
    if (!activeAssignment?.questions) return;

    const responses = activeAssignment.questions.map((q) => ({
      assignment_id: activeAssignment.id,
      question_id: q.id,
      response_value: answers[q.id] || "",
    }));

    const { error } = await supabase.from("questionnaire_responses").insert(responses);
    if (error) {
      toast.error("Erro ao enviar respostas");
      return;
    }

    await supabase
      .from("questionnaire_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", activeAssignment.id);

    toast.success("Respostas enviadas!");
    setActiveAssignment(null);
    fetchAssignments();
  };

  const pendingCount = assignments.filter((a) => a.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Questionários
            {pendingCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum questionário recebido
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm text-foreground">{a.template?.title || "Questionário"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")} · {a.status === "completed" ? "Respondido" : "Pendente"}
                    </p>
                  </div>
                  {a.status === "pending" ? (
                    <Button size="sm" onClick={() => openQuestionnaire(a)}>Responder</Button>
                  ) : (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!activeAssignment} onOpenChange={(open) => !open && setActiveAssignment(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeAssignment?.template?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {activeAssignment?.questions?.map((q) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                {q.question_type === "scale" ? (
                  <div className="space-y-1">
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[Number(answers[q.id] || 5)]}
                      onValueChange={([v]) => setAnswers({ ...answers, [q.id]: String(v) })}
                    />
                    <p className="text-center text-sm font-bold text-primary">{answers[q.id] || 5}</p>
                  </div>
                ) : q.question_type === "number" ? (
                  <Input
                    type="number"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="0"
                  />
                ) : (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Sua resposta..."
                  />
                )}
              </div>
            ))}
            <Button onClick={submitResponses} className="w-full">
              Enviar Respostas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuestionnaireList;
