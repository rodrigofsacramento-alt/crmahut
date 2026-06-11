import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type Visit = Tables<'visits'> & {
  lead?: Tables<'leads'> | null;
  property?: Tables<'properties'> | null;
  agent?: Tables<'profiles'> | null;
  google_event_id?: string | null;
  google_calendar_id?: string | null;
  google_calendar_link?: string | null;
  google_synced_at?: string | null;
  google_sync_status?: 'pending' | 'synced' | 'error' | 'skipped' | null;
  google_sync_error?: string | null;
};

async function syncVisitWithGoogleCalendar(visitId: string, action: 'upsert' | 'delete' = 'upsert') {
  try {
    const { error } = await supabase.functions.invoke('google-calendar-sync', {
      body: { visit_id: visitId, action },
    });
    if (error) {
      console.warn('Google Calendar sync skipped:', error.message);
    }
  } catch (err: any) {
    console.warn('Google Calendar sync skipped:', err?.message || err);
  }
}

export function useSyncVisitGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, action = 'upsert' }: { visitId: string; action?: 'upsert' | 'delete' }) => {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { visit_id: visitId, action },
      });
      if (error) throw error;
      return data as { ok?: boolean; status?: string; error?: string; link?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

export function useVisits(filters?: {
  month?: number; // 0-indexed
  year?: number;
  status?: string;
  agent_id?: string;
}) {
  const { user, profile } = useAuth();
  const isAgent = profile?.role === 'agent';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('visits-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        queryClient.invalidateQueries({ queryKey: ['visits'] });
        queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['visits', filters, user?.id, isAgent],
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select(`
          *,
          lead:leads!visits_lead_id_fkey(id, name, email, phone, stage, score, sla_status, source, responsible_id),
          property:properties!visits_property_id_fkey(id, title, code, location, address, price, type, status, description, bedrooms, bathrooms, area, images),
          agent:profiles!visits_agent_id_fkey(id, full_name, role)
        `)
        .order('scheduled_at', { ascending: true });

      // Corretores só veem visitas atribuídas a eles
      if (isAgent && user?.id) {
        query = query.eq('agent_id', user.id);
      } else if (filters?.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }

      if (filters?.month !== undefined && filters?.year !== undefined) {
        const startDate = new Date(filters.year, filters.month, 1);
        const endDate = new Date(filters.year, filters.month + 1, 0, 23, 59, 59);
        query = query
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Visit[];
    },
  });
}

export function useVisitsByDate(date: string | null) {
  return useQuery({
    queryKey: ['visits', 'by-date', date],
    enabled: !!date,
    queryFn: async () => {
      if (!date) return [];
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          lead:leads!visits_lead_id_fkey(id, name, email, phone, stage, score, sla_status, source, responsible_id),
          property:properties!visits_property_id_fkey(id, title, code, location, address, price, type, status, description, bedrooms, bathrooms, area, images),
          agent:profiles!visits_agent_id_fkey(id, full_name, role)
        `)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as Visit[];
    },
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visit: TablesInsert<'visits'>) => {
      const { data, error } = await supabase
        .from('visits')
        .insert(visit)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      if (data?.id) {
        void syncVisitWithGoogleCalendar(data.id).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['visits'] });
        });
      }
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'visits'> & { id: string }) => {
      const { data, error } = await supabase
        .from('visits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      if (data?.id) {
        const action = data.status === 'cancelled' ? 'delete' : 'upsert';
        void syncVisitWithGoogleCalendar(data.id, action).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['visits'] });
        });
      }
    },
  });
}

export function useConfirmVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('visits')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      if (data?.id) {
        void syncVisitWithGoogleCalendar(data.id).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['visits'] });
        });
      }
    },
  });
}

export function useCompleteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, feedback, rating, notes }: { id: string; feedback?: string; rating?: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('visits')
        .update({ status: 'completed', feedback, rating, notes })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

// Count visits per day for a given month (for limit checking)
export function useVisitsCountByDay(year: number, month: number) {
  return useQuery({
    queryKey: ['visits', 'count-by-day', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_at')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((v) => {
        const day = v.scheduled_at.split('T')[0];
        counts[day] = (counts[day] || 0) + 1;
      });
      return counts;
    },
  });
}

// Create notification for manager when limit exceeded
export async function createVisitLimitNotification(userId: string, date: string, visitCount: number) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: 'Limite de visitas excedido',
      message: `${visitCount}ª visita agendada para ${date}. O limite recomendado é de 2 visitas por dia.`,
      type: 'warning',
      is_read: false,
    });
  if (error) console.warn('Erro ao criar notificação:', error.message);
}
