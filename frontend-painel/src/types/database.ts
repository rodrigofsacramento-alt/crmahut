export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          client_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string
          subject: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          agent_id: string | null
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string | null
          type: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          type: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_timeline: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          interest: string | null
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          property_id: string | null
          responsible_id: string | null
          score: number | null
          sla_deadline: string | null
          sla_status: string | null
          source: string | null
          stage: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          interest?: string | null
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          responsible_id?: string | null
          score?: number | null
          sla_deadline?: string | null
          sla_status?: string | null
          source?: string | null
          stage?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          interest?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          responsible_id?: string | null
          score?: number | null
          sla_deadline?: string | null
          sla_status?: string | null
          source?: string | null
          stage?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          category: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_posts: {
        Row: {
          asset_id: string | null
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          metrics_clicks: number | null
          metrics_engagement: number | null
          metrics_reach: number | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          metrics_clicks?: number | null
          metrics_engagement?: number | null
          metrics_reach?: number | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metrics_clicks?: number | null
          metrics_engagement?: number | null
          metrics_reach?: number | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "marketing_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          max_agents: number
          max_leads: number
          max_properties: number
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_agents?: number
          max_leads?: number
          max_properties?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_agents?: number
          max_leads?: number
          max_properties?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          creci: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          creci?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          creci?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string | null
          area: string | null
          bathrooms: number | null
          bedrooms: number | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_favorite: boolean | null
          leads_id: string | null
          location: string
          owner_name: string | null
          owner_phone: string | null
          parking: number | null
          price: number
          price_type: string | null
          rooms: number | null
          status: string
          tenant_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_favorite?: boolean | null
          leads_id?: string | null
          location: string
          owner_name?: string | null
          owner_phone?: string | null
          parking?: number | null
          price: number
          price_type?: string | null
          rooms?: number | null
          status?: string
          tenant_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_favorite?: boolean | null
          leads_id?: string | null
          location?: string
          owner_name?: string | null
          owner_phone?: string | null
          parking?: number | null
          price?: number
          price_type?: string | null
          rooms?: number | null
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
        Row: {
          checklist_item_id: string | null
          comment: string | null
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          proposal_id: string
          status: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          checklist_item_id?: string | null
          comment?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          proposal_id: string
          status?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checklist_item_id?: string | null
          comment?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          proposal_id?: string
          status?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          proposal_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          proposal_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          proposal_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_records: {
        Row: {
          id: string
          tenant_id: string | null
          proposal_id: string | null
          property_id: string
          agent_id: string | null
          buyer_name: string
          sale_value: number
          contract_signed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          proposal_id?: string | null
          property_id: string
          agent_id?: string | null
          buyer_name: string
          sale_value: number
          contract_signed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          proposal_id?: string | null
          property_id?: string
          agent_id?: string | null
          buyer_name?: string
          sale_value?: number
          contract_signed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_records_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_commissions: {
        Row: {
          id: string
          agent_id: string
          property_id: string | null
          client_id: string | null
          sale_value: number
          sale_currency: string
          property_type: string
          commission_base_usd: number
          gross_commission_pyg: number
          net_commission_agent_pyg: number
          supervisor_id: string | null
          supervisor_commission_pyg: number | null
          manager_id: string | null
          manager_commission_pyg: number | null
          has_assessoria: boolean | null
          assessoria_base_pyg: number | null
          assessoria_agent_pyg: number | null
          assessoria_supervisor_pyg: number | null
          assessoria_manager_pyg: number | null
          status: string
          month_reference: string
          created_at: string | null
          updated_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          agent_id: string
          property_id?: string | null
          client_id?: string | null
          sale_value: number
          sale_currency?: string
          property_type: string
          commission_base_usd: number
          gross_commission_pyg: number
          net_commission_agent_pyg: number
          supervisor_id?: string | null
          supervisor_commission_pyg?: number | null
          manager_id?: string | null
          manager_commission_pyg?: number | null
          has_assessoria?: boolean | null
          assessoria_base_pyg?: number | null
          assessoria_agent_pyg?: number | null
          assessoria_supervisor_pyg?: number | null
          assessoria_manager_pyg?: number | null
          status?: string
          month_reference: string
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          agent_id?: string
          property_id?: string | null
          client_id?: string | null
          sale_value?: number
          sale_currency?: string
          property_type?: string
          commission_base_usd?: number
          gross_commission_pyg?: number
          net_commission_agent_pyg?: number
          supervisor_id?: string | null
          supervisor_commission_pyg?: number | null
          manager_id?: string | null
          manager_commission_pyg?: number | null
          has_assessoria?: boolean | null
          assessoria_base_pyg?: number | null
          assessoria_agent_pyg?: number | null
          assessoria_supervisor_pyg?: number | null
          assessoria_manager_pyg?: number | null
          status?: string
          month_reference?: string
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      commission_rules: {
        Row: {
          id: string
          rule_type: string
          min_value: number
          max_value: number | null
          percentage_agent: number | null
          percentage_supervisor: number | null
          percentage_manager: number | null
          fixed_bonus_amount: number | null
          currency: string
          created_at: string | null
          updated_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          rule_type: string
          min_value?: number
          max_value?: number | null
          percentage_agent?: number | null
          percentage_supervisor?: number | null
          percentage_manager?: number | null
          fixed_bonus_amount?: number | null
          currency?: string
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          rule_type?: string
          min_value?: number
          max_value?: number | null
          percentage_agent?: number | null
          percentage_supervisor?: number | null
          percentage_manager?: number | null
          fixed_bonus_amount?: number | null
          currency?: string
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: number
          content: string
          metadata: Json
          embedding: number[] | null
          tenant_id: string
        }
        Insert: {
          id?: number
          content: string
          metadata?: Json
          embedding?: number[] | null
          tenant_id: string
        }
        Update: {
          id?: number
          content?: string
          metadata?: Json
          embedding?: number[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      proposals: {
        Row: {
          agent_id: string | null
          client_name: string
          created_at: string | null
          created_by: string | null
          current_stage: number | null
          id: string
          lead_id: string | null
          notes: string | null
          payment_type: string | null
          property_id: string | null
          proposal_number: string
          signature_status: string | null
          sla: string | null
          status: string
          tenant_id: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          agent_id?: string | null
          client_name: string
          created_at?: string | null
          created_by?: string | null
          current_stage?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_type?: string | null
          property_id?: string | null
          proposal_number: string
          signature_status?: string | null
          sla?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          value: number
        }
        Update: {
          agent_id?: string | null
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          current_stage?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_type?: string | null
          property_id?: string | null
          proposal_number?: string
          signature_status?: string | null
          sla?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          sent_at: string | null
          sent_count: number
          severity: string
          target_type: string
          target_value: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          sent_at?: string | null
          sent_count?: number
          severity?: string
          target_type?: string
          target_value?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          sent_count?: number
          severity?: string
          target_type?: string
          target_value?: string | null
          title?: string
        }
        Relationships: []
      }
      sa_email_templates: {
        Row: {
          body_html: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      sa_financial_transactions: {
        Row: {
          amount_cents: number
          category: string
          created_at: string | null
          created_by: string | null
          currency: string
          description: string
          id: string
          metadata: Json | null
          reference: string | null
          status: string
          subcategory: string | null
          subscription_id: string | null
          tenant_id: string | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          category: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string
          subcategory?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string
          subcategory?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sa_financial_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      social_integrations: {
        Row: {
          access_token: string
          account_name: string | null
          created_at: string | null
          id: string
          page_id: string | null
          platform: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          platform: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          platform?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          cancelled_at: string | null
          created_at: string | null
          ends_at: string | null
          external_id: string | null
          id: string
          payment_method: string | null
          plan_id: string
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          plan_id: string
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          email: string
          id: string
          logo_url: string | null
          max_agents: number | null
          max_properties: number | null
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_user_id: string | null
          phone: string | null
          plan_id: string | null
          settings: Json | null
          slug: string
          state: string | null
          status: string
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email: string
          id?: string
          logo_url?: string | null
          max_agents?: number | null
          max_properties?: number | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan_id?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          max_agents?: number | null
          max_properties?: number | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan_id?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          agent_id: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          lead_id: string | null
          notes: string | null
          property_id: string | null
          rating: number | null
          scheduled_at: string
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          property_id?: string | null
          rating?: number | null
          scheduled_at: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          property_id?: string | null
          rating?: number | null
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      broadcast_announcement: {
        Args: { p_announcement_id: string }
        Returns: Json
      }
      cancel_subscription: {
        Args: { p_reason?: string; p_subscription_id: string }
        Returns: Json
      }
      create_agent_user: {
        Args: {
          p_creci?: string
          p_email: string
          p_full_name: string
          p_password: string
          p_phone?: string
        }
        Returns: string
      }
      get_my_tenant_id: { Args: never; Returns: string }
      provision_tenant: {
        Args: {
          p_admin_email: string
          p_admin_name: string
          p_admin_password?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      sa_health_metrics: { Args: never; Returns: Json }
      toggle_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
