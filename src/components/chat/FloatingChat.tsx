import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Minus, Send, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const FloatingChat = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determinar com quem o usuário está falando
  useEffect(() => {
    if (!user) return;

    const findTarget = async () => {
      if (profile?.role === "patient") {
        // Buscar o nutricionista vinculado
        const { data } = await supabase
          .from("nutritionist_patients")
          .select("nutritionist_id, profiles!nutritionist_id(full_name)")
          .eq("patient_id", user.id)
          .single();
        
        if (data) {
          setTargetUser({ 
            id: data.nutritionist_id, 
            name: (data as any).profiles?.full_name || "Seu Nutricionista" 
          });
        }
      } else if (profile?.role === "admin") {
        // Para nutris, em um chat flutuante global, poderíamos pegar o último paciente interagido
        // Ou deixar que o nutri selecione. Para simplificar o MVP do chat flutuante:
        // Buscamos o primeiro paciente vinculado por enquanto.
        const { data } = await supabase
          .from("nutritionist_patients")
          .select("patient_id, profiles!patient_id(full_name)")
          .eq("nutritionist_id", user.id)
          .limit(1)
          .single();
        
        if (data) {
          setTargetUser({ 
            id: data.patient_id, 
            name: (data as any).profiles?.full_name || "Paciente" 
          });
        }
      }
    };

    findTarget();
  }, [user, profile]);

  // Buscar mensagens e assinar Realtime
  useEffect(() => {
    if (!user || !targetUser) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel("chat_room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.sender_id === targetUser.id) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, targetUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !targetUser) return;

    const tempMsg = {
      id: Math.random().toString(),
      sender_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: targetUser.id,
      content: newMessage,
    });

    if (error) {
      console.error("Erro ao enviar mensagem:", error);
      // Opcional: remover tempMsg ou marcar erro
    }
  };

  if (!user || !targetUser) return null;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 animate-bounce"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 w-80 md:w-96 z-50 transition-all duration-300",
      isMinimized ? "h-14" : "h-[500px]"
    )}>
      <Card className="h-full flex flex-col shadow-2xl border-primary/20 bg-background/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-3 bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0 h-14">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <CardTitle className="text-sm font-medium truncate max-w-[150px]">
              {targetUser.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/10" onClick={() => setIsMinimized(!isMinimized)}>
              <Minus className="h-4 w-4 text-primary-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/10" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.sender_id === user.id ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 text-sm",
                          msg.sender_id === user.id
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-foreground rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>
            
            <div className="p-3 border-t bg-muted/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button type="submit" size="sm" className="h-9 px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
