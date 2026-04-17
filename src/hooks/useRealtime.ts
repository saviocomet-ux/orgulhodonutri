import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para assinar mudanças em tempo real no Supabase e invalidar queries do TanStack Query.
 * @param tables Array de nomes das tabelas para monitorar.
 * @param queryKeys Array de chaves de query para invalidar quando ocorrer uma mudança.
 */
export function useRealtimeSubscription(tables: string[], queryKeys: any[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Canal único para múltiplas tabelas ou canais separados? 
    // Por simplicidade e eficiência, usamos um canal por tabela ou um geral se preferir.
    const channels = tables.map(table => {
      return supabase
        .channel(`realtime:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          (payload) => {
            console.log(`Realtime change detected in ${table}:`, payload);
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, queryKeys, queryClient]);
}
