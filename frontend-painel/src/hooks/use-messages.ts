import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';


export type Conversation = {
  id: string;
  client_id: string;
  agent_id: string | null;
  subject: string | null;
  status: string;
  ai_enabled?: boolean | null;
  ai_paused_at?: string | null;
  ai_paused_by?: string | null;
  tags?: string[] | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  client?: { id: string; full_name: string; email: string | null; phone: string | null; avatar_url: string | null } | null;
  agent?: { id: string; full_name: string; email: string | null; phone: string | null; avatar_url: string | null } | null;
  unread_count?: number;
};

export type LeadNextAction = {
  lead_id: string;
  tenant_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  stage: string | null;
  next_action: string | null;
  action_priority: number | null;
  missing_fields: string[] | null;
  missing_count: number | null;
  perfil_completo: boolean | null;
  score_confianca: number | null;
  tipo_imovel_p1?: string | null;
  p2_quartos_suites?: string | null;
  p3_tamanho_imovel?: string | null;
  p4_localizacao?: string | null;
  p5_faixa_valor?: string | null;
  p6_perfil_familiar?: string | null;
  p7_necessidades_especiais?: string | null;
  p8_urgencia?: string | null;
  suggested_property_id: string | null;
  recommended_property_id?: string | null;
  recommended_property_title?: string | null;
  recommended_property_code?: string | null;
  recommended_property_score?: number | null;
  has_strong_property_match?: boolean | null;
};

export type LeadPropertyRecommendation = {
  lead_id: string;
  tenant_id: string;
  lead_name: string | null;
  lead_phone: string | null;
  property_id: string;
  property_code: string | null;
  property_title: string;
  property_description: string | null;
  property_location: string;
  property_address: string | null;
  property_price: number | string | null;
  price_type: string | null;
  property_status: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  area: string | null;
  image_url: string | null;
  images: string[] | null;
  match_score: number;
  match_reasons: string[] | null;
  recommendation_rank: number;
  strong_match: boolean;
  recommendation_date: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string | null;
  sender?: { id: string; full_name: string; role: string; avatar_url: string | null } | null;
};

export function useConversations(userId?: string, role?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', userId, role],
    enabled: !!userId,
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          client:profiles!conversations_client_id_fkey(id, full_name, email, phone, avatar_url),
          agent:profiles!conversations_agent_id_fkey(id, full_name, email, phone, avatar_url)
        `)
        .order('updated_at', { ascending: false });

      if (role === 'client') {
        query = query.eq('client_id', userId!);
      } else if (role === 'agent') {
        query = query.eq('agent_id', userId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);

  return query;
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId,
    refetchInterval: conversationId ? 5000 : false,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, role, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const inserted = payload.new as Message;
          queryClient.setQueryData<Message[]>(['messages', conversationId], (current = []) => {
            if (current.some((message) => message.id === inserted.id)) return current;
            return [...current, inserted].sort((a, b) => {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return aTime - bTime;
            });
          });
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      conversation_id: string;
      sender_id: string;
      receiver_id?: string | null;
      content: string;
      message_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id || null,
          content: message.content,
          message_type: message.message_type || 'text',
        })
        .select()
        .single();
      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', message.conversation_id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation: {
      client_id: string;
      agent_id?: string | null;
      subject?: string;
    }) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          client_id: conversation.client_id,
          agent_id: conversation.agent_id || null,
          subject: conversation.subject || null,
          status: 'open',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversationTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, tags }: { conversationId: string; tags: string[] }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ tags })
        .eq('id', conversationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      status,
      agentId,
    }: {
      conversationId: string;
      status: string;
      agentId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          status,
          agent_id: agentId,
        })
        .eq('id', conversationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useLeadNextActions(enabled = true) {
  return useQuery({
    queryKey: ['lead-next-actions'],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('lead_next_actions')
        .select(`
          lead_id,
          tenant_id,
          name,
          phone,
          email,
          stage,
          next_action,
          action_priority,
          missing_fields,
          missing_count,
          perfil_completo,
          score_confianca,
          tipo_imovel_p1,
          p2_quartos_suites,
          p3_tamanho_imovel,
          p4_localizacao,
          p5_faixa_valor,
          p6_perfil_familiar,
          p7_necessidades_especiais,
          p8_urgencia,
          suggested_property_id,
          recommended_property_id,
          recommended_property_title,
          recommended_property_code,
          recommended_property_score,
          has_strong_property_match
        `)
        .order('action_priority', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadNextAction[];
    },
    staleTime: 30_000,
  });
}

export function useLeadPropertyRecommendations(enabled = true) {
  return useQuery({
    queryKey: ['lead-property-recommendations'],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('lead_best_property_recommendations')
        .select(`
          lead_id,
          tenant_id,
          lead_name,
          lead_phone,
          property_id,
          property_code,
          property_title,
          property_description,
          property_location,
          property_address,
          property_price,
          price_type,
          property_status,
          property_type,
          bedrooms,
          bathrooms,
          parking,
          area,
          image_url,
          images,
          match_score,
          match_reasons,
          recommendation_rank,
          strong_match,
          recommendation_date
        `)
        .order('match_score', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadPropertyRecommendation[];
    },
    staleTime: 30_000,
  });
}

export function useMarkPropertyRecommended() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      propertyId,
      matchScore,
      notes,
    }: {
      leadId: string;
      propertyId: string;
      matchScore?: number | null;
      notes?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc('mark_property_recommended_to_lead', {
        p_lead_id: leadId,
        p_property_id: propertyId,
        p_match_score: matchScore || null,
        p_notes: notes || null,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Não foi possível registrar a indicação.');
      }

      return data as {
        success: boolean;
        lead_id: string;
        property_id: string;
        property_code?: string | null;
        property_title?: string | null;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-next-actions'] });
      queryClient.invalidateQueries({ queryKey: ['lead-property-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSetConversationAIEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, enabled }: { conversationId: string; enabled: boolean }) => {
      const { data, error } = await supabase.rpc('set_conversation_ai_enabled', {
        p_conversation_id: conversationId,
        p_enabled: enabled,
      });
      if (error) throw error;
      return data as { success: boolean; conversation_id: string; ai_enabled: boolean };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fullName, 
      phone, 
      agentId,
      tenantId
    }: { 
      fullName: string, 
      phone: string, 
      agentId: string,
      tenantId: string
    }) => {
      // 1. Create the lead in profiles
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          tenant_id: tenantId,
          full_name: fullName,
          phone: phone,
          role: 'client'
        })
        .select()
        .single();
        
      if (profileError) throw profileError;

      // 2. Create the conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          client_id: newProfile.id,
          agent_id: agentId,
          subject: `Atendimento com ${fullName}`,
          status: 'open',
          ai_enabled: true
        })
        .select()
        .single();

      if (convError) throw convError;

      return { profile: newProfile, conversation: newConversation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });
}

