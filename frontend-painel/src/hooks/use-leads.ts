import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type Lead = Tables<'leads'> & {
  responsible?: Tables<'profiles'> | null;
  timeline?: Tables<'lead_timeline'>[];
};

export function useLeads(filters?: {
  stage?: string;
  source?: string;
  search?: string;
}) {
  const { user, profile } = useAuth();
  const isAgent = profile?.role === 'agent';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['leads', filters, user?.id, isAgent],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, responsible:profiles!leads_responsible_id_fkey(*)')
        .order('last_interaction', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Corretores só veem leads atribuídos a eles
      if (isAgent && user?.id) {
        query = query.eq('responsible_id', user.id);
      }

      if (filters?.stage && filters.stage !== 'Todos') {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*, responsible:profiles!leads_responsible_id_fkey(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
}

export function useLeadTimeline(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_timeline')
        .select('*, user:profiles!lead_timeline_user_id_fkey(*)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: TablesInsert<'leads'>) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select('*, responsible:profiles!leads_responsible_id_fkey(*)')
        .single();
      if (error) throw error;

      // Create timeline event
      await supabase.from('lead_timeline').insert({
        lead_id: data.id,
        type: 'lead_created',
        title: 'Lead Criado',
        description: `Lead cadastrado via sistema. Origem: ${lead.source || 'N/A'}.`,
        user_id: lead.created_by,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'leads'> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select('*, responsible:profiles!leads_responsible_id_fkey(*)')
        .single();
      if (error) throw error;

      // Create timeline event for edit
      await supabase.from('lead_timeline').insert({
        lead_id: id,
        type: 'edit',
        title: 'Dados Alterados',
        description: 'Dados do lead foram atualizados.',
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', data.id] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useLeadStats() {
  return useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('stage, sla_status, score');
      if (error) throw error;

      const total = leads.length;
      const byStage: Record<string, number> = {};
      const bySla: Record<string, number> = {};

      leads.forEach((lead) => {
        byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
        if (lead.sla_status) {
          bySla[lead.sla_status] = (bySla[lead.sla_status] || 0) + 1;
        }
      });

      return { total, byStage, bySla };
    },
  });
}
