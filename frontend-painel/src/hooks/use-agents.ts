import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AgentProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  creci: string | null;
  avatar_url: string | null;
  created_at: string | null;
  // Computed stats
  leads_count?: number;
  visits_count?: number;
  proposals_count?: number;
};

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // Fetch profiles with agent/admin/manager roles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['agent', 'admin', 'manager'])
        .order('full_name');

      if (error) throw error;

      // Fetch lead counts per responsible
      const { data: leadCounts } = await supabase
        .from('leads')
        .select('responsible_id');

      // Fetch visit counts per agent
      const { data: visitCounts } = await supabase
        .from('visits')
        .select('agent_id');

      // Fetch proposal counts per agent
      const { data: proposalCounts } = await supabase
        .from('proposals')
        .select('agent_id');

      // Aggregate counts
      const leadsMap: Record<string, number> = {};
      const visitsMap: Record<string, number> = {};
      const proposalsMap: Record<string, number> = {};

      leadCounts?.forEach(l => {
        if (l.responsible_id) leadsMap[l.responsible_id] = (leadsMap[l.responsible_id] || 0) + 1;
      });
      visitCounts?.forEach(v => {
        if (v.agent_id) visitsMap[v.agent_id] = (visitsMap[v.agent_id] || 0) + 1;
      });
      proposalCounts?.forEach(p => {
        if (p.agent_id) proposalsMap[p.agent_id] = (proposalsMap[p.agent_id] || 0) + 1;
      });

      return (profiles || []).map(p => ({
        ...p,
        leads_count: leadsMap[p.id] || 0,
        visits_count: visitsMap[p.id] || 0,
        proposals_count: proposalsMap[p.id] || 0,
      })) as AgentProfile[];
    },
  });
}

export type CreateAgentInput = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  creci?: string;
};

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      const { data, error } = await supabase.rpc('create_agent_user', {
        p_email: input.email,
        p_password: input.password,
        p_full_name: input.full_name,
        p_phone: input.phone || null,
        p_creci: input.creci || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
