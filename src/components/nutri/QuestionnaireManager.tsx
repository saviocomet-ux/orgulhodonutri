import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Send, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface PatientWithProfile {
  patient_id: string;
  profile: Profile | null;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  is_system_default: boolean;
  questions: Question[];
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  display_order: number;
  is_fixed: boolean;
}

const DEFAULT_QUESTIONS = [
  { question_text: "Quantas refeições livres você fez essa semana?", question_type: "number", display_order: 1, is_fixed: true },
  { question_text: "Frequência de consumo de vegetais (1-10)", question_type: "scale", display_order: 2, is_fixed: true },
  { question_text: "Frequência de consumo de frutas (1-10)", question_type: "scale", display_order: 3, is_fixed: true },
  { question_text: "Como está seu nível de energia? (1-10)", question_type: "scale", display_order: 4, is_fixed: true },
  { question_text: "Como está a qualidade do seu sono? (1-10)", question_type: "scale", display_order: 5, is_fixed: true },
  { question_text: "Praticou exercício físico essa semana? Quantas vezes?", question_type: "number", display_order: 6, is_fixed: true },
  { question_text: "Como está seu humor geral? (1-10)", question_type: "scale", display_order: 7, is_fixed: true },
];

const QuestionnaireManager = ({ patients }: { patients: PatientWithProfile[] }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [customQuestions, setCustomQuestions] = useState<{ text: string; type: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");

  const fetchTemplates = async () => {
    if (!user) return;
    const { data: temps } = await supabase
      .from("questionnaire_templates")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (!temps) return;

    const templatesWithQuestions: Template[] = [];
    for (const t of temps) {
      const { data: questions } = await supabase
        .from("questionnaire_questions")
        .select("*")
        .eq("template_id", t.id)
        .order("display_order");
      templatesWithQuestions.push({ ...t, questions: questions || [] });
    }
    setTemplates(templatesWithQuestions);
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const createTemplate = async () => {
    if (!user || !newTitle.trim()) return;

    const { data: template, error } = await supabase
      .from("questionnaire_templates")
      .insert({ nutritionist_id: user.id, title: newTitle, description: newDesc || null })
      .select()
      .single();

    if (error || !template) {
      toast.error("Erro ao criar questionário");
      return;
    }

    // Insert default fixed questions + custom
    const allQuestions = [
      ...DEFAULT_QUESTIONS.map((q) => ({
        template_id: template.id,
        ...q,
      })),
      ...customQuestions.map((q, i) => ({
        template_id: template.id,
        question_text: q.text,
        question_type: q.type,
        display_order: DEFAULT_QUESTIONS.length + i + 1,
        is_fixed: false,
      })),
    ];

    const { error: qErr } = await supabase.from("questionnaire_questions").insert(allQuestions);
    if (qErr) {
      toast.error("Erro ao salvar perguntas");
    } else {
      toast.success("Questionário criado!");
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setCustomQuestions([]);
      fetchTemplates();
    }
  };

  const sendQuestionnaire = async () => {
    if (!user || !selectedTemplate || !selectedPatient) return;

    const { error } = await supabase.from("questionnaire_assignments").insert({
      template_id: selectedTemplate,
      nutritionist_id: user.id,
      patient_id: selectedPatient,
    });

    if (error) {
      toast.error("Erro ao enviar questionário");
    } else {
      toast.success("Questionário enviado ao paciente!");
      setSendOpen(false);
      setSelectedTemplate("");
      setSelectedPatient("");
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("questionnaire_templates").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      fetchTemplates();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              Criar Questionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Questionário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Textarea placeholder="Descrição (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Perguntas fixas (inclusas automaticamente):</p>
                <div className="space-y-1">
                  {DEFAULT_QUESTIONS.map((q, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {q.question_text}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Perguntas personalizadas:</p>
                {customQuestions.map((q, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      value={q.text}
                      onChange={(e) => {
                        const copy = [...customQuestions];
                        copy[i].text = e.target.value;
                        setCustomQuestions(copy);
                      }}
                      placeholder="Texto da pergunta"
                      className="flex-1"
                    />
                    <Select
                      value={q.type}
                      onValueChange={(v) => {
                        const copy = [...customQuestions];
                        copy[i].type = v;
                        setCustomQuestions(copy);
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scale">Escala</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCustomQuestions(customQuestions.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomQuestions([...customQuestions, { text: "", type: "scale" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar pergunta
                </Button>
              </div>

              <Button onClick={createTemplate} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="flex-1" disabled={templates.length === 0 || patients.length === 0}>
              <Send className="h-4 w-4 mr-1" />
              Enviar para Paciente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Questionário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher questionário" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.patient_id} value={p.patient_id}>
                      {p.profile?.full_name || "Paciente"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={sendQuestionnaire} className="w-full" disabled={!selectedTemplate || !selectedPatient}>
                Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates list */}
      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
            <p className="text-xs text-muted-foreground">{t.questions.length} perguntas</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuestionnaireManager;
