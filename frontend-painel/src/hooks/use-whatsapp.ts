import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type WhatsAppSession = {
  id: string;
  tenant_id: string;
  session_name: string;
  phone_number: string | null;
  ai_enabled?: boolean | null;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  qr_code: string | null;
  qr_expires_at: string | null;
  pairing_code: string | null;
  last_connected_at: string | null;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function useWhatsAppSession() {
  return useQuery({
    queryKey: ['whatsapp-session'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data ?? null) as WhatsAppSession | null;
    },
    // Poll the status every 3 seconds if the session is not yet fully connected.
    // This serves as an infallible fallback if Supabase Realtime connections are slow or blocked.
    refetchInterval: (query) => {
      const session = query.state.data as WhatsAppSession | null;
      if (!session || session.status === 'connected') {
        return false;
      }
      return 3000;
    },
  });
}

export function useStartWhatsAppSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone_number }: { phone_number?: string } = {}) => {
      const { data, error } = await (supabase as any).rpc('start_whatsapp_session', {
        p_session_name: 'default',
        p_phone_number: phone_number || null,
      });
      if (error) throw error;
      return data as { success: boolean; session_id: string; status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-session'] });
    },
  });
}

export function useDisconnectWhatsAppSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('disconnect_whatsapp_session', {
        p_session_name: 'default',
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-session'] });
    },
  });
}

export function useSetWhatsAppAIEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enabled }: { enabled: boolean }) => {
      const { data, error } = await (supabase as any).rpc('set_whatsapp_ai_enabled', {
        p_session_name: 'default',
        p_enabled: enabled,
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Erro ao atualizar IA');
      return data as { success: boolean; ai_enabled: boolean; session_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-session'] });
    },
  });
}

export type WhatsAppMessage = {
  id: string;
  tenant_id: string;
  remote_jid: string;
  from_me: boolean;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  created_at: string | null;
};

export function useWhatsAppMessages(remoteJid?: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', remoteJid],
    queryFn: async () => {
      let query = (supabase as any)
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (remoteJid) {
        query = query.eq('remote_jid', remoteJid);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as WhatsAppMessage[];
    },
    enabled: !!remoteJid,
  });
}

export function useSendWhatsAppMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data, error } = await (supabase as any).rpc('send_whatsapp_message', {
        p_conversation_id: conversationId,
        p_content: content,
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Erro ao enviar WhatsApp');
      return data as { success: boolean; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
