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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accountant_client_history: {
        Row: {
          action: string
          amount: number | null
          by_name: string | null
          client_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          amount?: number | null
          by_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          by_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountant_client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accountant_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      accountant_clients: {
        Row: {
          breakdown: Json
          country: string
          created_at: string
          created_via: string
          currency: string
          email: string | null
          fiscal_year: number
          hawl_date: string | null
          id: string
          kind: string
          last_calc_amount: number | null
          last_calc_at: string | null
          madhab: string
          name: string
          nisab: number
          notes: string | null
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          breakdown?: Json
          country?: string
          created_at?: string
          created_via?: string
          currency?: string
          email?: string | null
          fiscal_year?: number
          hawl_date?: string | null
          id?: string
          kind?: string
          last_calc_amount?: number | null
          last_calc_at?: string | null
          madhab?: string
          name: string
          nisab?: number
          notes?: string | null
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          breakdown?: Json
          country?: string
          created_at?: string
          created_via?: string
          currency?: string
          email?: string | null
          fiscal_year?: number
          hawl_date?: string | null
          id?: string
          kind?: string
          last_calc_amount?: number | null
          last_calc_at?: string | null
          madhab?: string
          name?: string
          nisab?: number
          notes?: string | null
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      erp_connections: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          db_name: string | null
          extra: Json
          id: string
          is_active: boolean
          label: string
          last_test_status: string | null
          last_tested_at: string | null
          provider: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          api_key: string
          base_url: string
          created_at?: string
          db_name?: string | null
          extra?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          db_name?: string | null
          extra?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      erp_sync_log: {
        Row: {
          amount: number | null
          connection_id: string
          created_at: string
          currency: string | null
          error_message: string | null
          external_id: string | null
          id: string
          provider: string
          reference: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          user_id: string
          zakat_record_id: string | null
        }
        Insert: {
          amount?: number | null
          connection_id: string
          created_at?: string
          currency?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          provider: string
          reference?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          user_id: string
          zakat_record_id?: string | null
        }
        Update: {
          amount?: number | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          reference?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          user_id?: string
          zakat_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "erp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_zakat_record_id_fkey"
            columns: ["zakat_record_id"]
            isOneToOne: false
            referencedRelation: "zakat_records"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_prices_daily: {
        Row: {
          created_at: string
          currency: string
          id: string
          metal: string
          price_date: string
          price_usd_per_gram: number
          reliability: string
          reliability_score: number
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          metal: string
          price_date: string
          price_usd_per_gram: number
          reliability?: string
          reliability_score?: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          metal?: string
          price_date?: string
          price_usd_per_gram?: number
          reliability?: string
          reliability_score?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nisab_prices: {
        Row: {
          country_code: string
          created_at: string
          currency: string
          event: string | null
          gold_nisab_value: number | null
          gold_price: number
          hijri_year: number | null
          id: string
          month: number | null
          reliability: string
          reliability_score: number
          silver_nisab_value: number | null
          silver_price: number
          source: string | null
          updated_at: string
          year: number
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency?: string
          event?: string | null
          gold_nisab_value?: number | null
          gold_price: number
          hijri_year?: number | null
          id?: string
          month?: number | null
          reliability?: string
          reliability_score?: number
          silver_nisab_value?: number | null
          silver_price: number
          source?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          country_code?: string
          created_at?: string
          currency?: string
          event?: string | null
          gold_nisab_value?: number | null
          gold_price?: number
          hijri_year?: number | null
          id?: string
          month?: number | null
          reliability?: string
          reliability_score?: number
          silver_nisab_value?: number | null
          silver_price?: number
          source?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      nisab_records: {
        Row: {
          calendar_basis: string
          created_at: string
          hijri_label: string | null
          id: string
          notes: string | null
          owner_label: string
          unified_nisab_date: string
          updated_at: string
        }
        Insert: {
          calendar_basis?: string
          created_at?: string
          hijri_label?: string | null
          id?: string
          notes?: string | null
          owner_label: string
          unified_nisab_date: string
          updated_at?: string
        }
        Update: {
          calendar_basis?: string
          created_at?: string
          hijri_label?: string | null
          id?: string
          notes?: string | null
          owner_label?: string
          unified_nisab_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          due_date: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
          zakat_record_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
          zakat_record_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
          zakat_record_id?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          legal_name: string | null
          name: string
          registration_no: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          legal_name?: string | null
          name: string
          registration_no?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name?: string
          registration_no?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sharia_attestations: {
        Row: {
          attestor_license: string | null
          attestor_name: string
          content_hash: string
          created_at: string
          id: string
          issued_at: string
          opinion: string
          sharia_refs: string[]
          title: string
          user_id: string
          zakat_record_id: string | null
        }
        Insert: {
          attestor_license?: string | null
          attestor_name: string
          content_hash: string
          created_at?: string
          id?: string
          issued_at?: string
          opinion: string
          sharia_refs?: string[]
          title: string
          user_id: string
          zakat_record_id?: string | null
        }
        Update: {
          attestor_license?: string | null
          attestor_name?: string
          content_hash?: string
          created_at?: string
          id?: string
          issued_at?: string
          opinion?: string
          sharia_refs?: string[]
          title?: string
          user_id?: string
          zakat_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sharia_attestations_zakat_record_id_fkey"
            columns: ["zakat_record_id"]
            isOneToOne: false
            referencedRelation: "zakat_records"
            referencedColumns: ["id"]
          },
        ]
      }
      sharia_audit_log: {
        Row: {
          action: string
          created_at: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          payload: Json | null
          sharia_refs: string[] | null
          user_agent: string | null
          user_id: string
          zakat_record_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json | null
          sharia_refs?: string[] | null
          user_agent?: string | null
          user_id: string
          zakat_record_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json | null
          sharia_refs?: string[] | null
          user_agent?: string | null
          user_id?: string
          zakat_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sharia_audit_log_zakat_record_id_fkey"
            columns: ["zakat_record_id"]
            isOneToOne: false
            referencedRelation: "zakat_records"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zakat_approvals: {
        Row: {
          checker_id: string | null
          checker_note: string | null
          created_at: string
          decided_at: string | null
          fingerprint: string | null
          id: string
          maker_id: string
          organization_id: string
          snapshot: Json
          status: Database["public"]["Enums"]["approval_status"]
          submitted_at: string
          title: string
          updated_at: string
          zakat_record_id: string | null
        }
        Insert: {
          checker_id?: string | null
          checker_note?: string | null
          created_at?: string
          decided_at?: string | null
          fingerprint?: string | null
          id?: string
          maker_id: string
          organization_id: string
          snapshot: Json
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_at?: string
          title: string
          updated_at?: string
          zakat_record_id?: string | null
        }
        Update: {
          checker_id?: string | null
          checker_note?: string | null
          created_at?: string
          decided_at?: string | null
          fingerprint?: string | null
          id?: string
          maker_id?: string
          organization_id?: string
          snapshot?: Json
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_at?: string
          title?: string
          updated_at?: string
          zakat_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zakat_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zakat_approvals_zakat_record_id_fkey"
            columns: ["zakat_record_id"]
            isOneToOne: false
            referencedRelation: "zakat_records"
            referencedColumns: ["id"]
          },
        ]
      }
      zakat_records: {
        Row: {
          created_at: string
          currency: string
          gregorian_date: string
          hijri_year: string | null
          id: string
          net_due: number
          notes: string | null
          organization_id: string | null
          prepaid_zakat: number
          record_type: string
          snapshot: Json | null
          total_assets: number
          total_liabilities: number
          updated_at: string
          user_id: string
          zakat_base: number
          zakat_due: number
        }
        Insert: {
          created_at?: string
          currency?: string
          gregorian_date?: string
          hijri_year?: string | null
          id?: string
          net_due?: number
          notes?: string | null
          organization_id?: string | null
          prepaid_zakat?: number
          record_type?: string
          snapshot?: Json | null
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id: string
          zakat_base?: number
          zakat_due?: number
        }
        Update: {
          created_at?: string
          currency?: string
          gregorian_date?: string
          hijri_year?: string | null
          id?: string
          net_due?: number
          notes?: string | null
          organization_id?: string | null
          prepaid_zakat?: number
          record_type?: string
          snapshot?: Json | null
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id?: string
          zakat_base?: number
          zakat_due?: number
        }
        Relationships: [
          {
            foreignKeyName: "zakat_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_hawl_reminders: { Args: never; Returns: number }
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["org_role"][]
          _user: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
    }
    Enums: {
      account_type: "individual" | "company" | "institution"
      app_role: "admin" | "moderator" | "user" | "accountant"
      approval_status: "pending" | "approved" | "rejected"
      org_role: "owner" | "admin" | "maker" | "checker" | "auditor" | "viewer"
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
    Enums: {
      account_type: ["individual", "company", "institution"],
      app_role: ["admin", "moderator", "user", "accountant"],
      approval_status: ["pending", "approved", "rejected"],
      org_role: ["owner", "admin", "maker", "checker", "auditor", "viewer"],
    },
  },
} as const
