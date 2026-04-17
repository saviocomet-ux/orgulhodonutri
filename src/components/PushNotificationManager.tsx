import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BO85qmr7GkSj7Y07GYuV--4cvx2OMudbrEilPYoGlqejhaVl_Yxo-xl8Vo-NshM4s7_IG8Sqx4G4YXQd-9fFVkM";

export const PushNotificationManager = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      setIsSupported(supported);

      if (supported) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
      setLoading(false);
    };

    checkSupport();
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          subscription: subscription.toJSON() as any,
          device_info: {
            userAgent: navigator.userAgent,
            platform: (navigator as any).platform,
          },
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Notificações ativadas com sucesso!");
    } catch (error) {
      console.error("Erro ao assinar push:", error);
      toast.error("Erro ao ativar notificações");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id);
        }
      }

      setIsSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (error) {
      console.error("Erro ao cancelar push:", error);
      toast.error("Erro ao desativar notificações");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      variant={isSubscribed ? "secondary" : "default"}
      size="sm"
      className="gap-2"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
    >
      {isSubscribed ? (
        <>
          <BellRing className="h-4 w-4 text-green-500 animate-pulse" />
          <span>Notificações Ativas</span>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          <span>Ativar Notificações</span>
        </>
      )}
    </Button>
  );
};
