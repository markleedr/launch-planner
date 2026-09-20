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
      app_notification: {
        Row: {
          body: string
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      collateral_file: {
        Row: {
          collateral_version_id: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          collateral_version_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          collateral_version_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "collateral_file_collateral_version_id_fkey"
            columns: ["collateral_version_id"]
            isOneToOne: false
            referencedRelation: "collateral_version"
            referencedColumns: ["id"]
          },
        ]
      }
      collateral_request: {
        Row: {
          created_at: string
          created_by: string
          cutoff_at: string
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cutoff_at: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cutoff_at?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collateral_request_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "deliverable_thread"
            referencedColumns: ["id"]
          },
        ]
      }
      collateral_version: {
        Row: {
          id: string
          notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_by: string
          thread_id: string
          version: number
        }
        Insert: {
          id?: string
          notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          thread_id: string
          version: number
        }
        Update: {
          id?: string
          notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          thread_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collateral_version_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "deliverable_thread"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_proposal: {
        Row: {
          awarded_at: string | null
          brief_id: string
          contractor_party_id: string
          created_at: string
          current_revision: number
          deadline_warning_sent_at: string | null
          id: string
          invitation_sent_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          awarded_at?: string | null
          brief_id: string
          contractor_party_id: string
          created_at?: string
          current_revision?: number
          deadline_warning_sent_at?: string | null
          id?: string
          invitation_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          awarded_at?: string | null
          brief_id?: string
          contractor_party_id?: string
          created_at?: string
          current_revision?: number
          deadline_warning_sent_at?: string | null
          id?: string
          invitation_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_proposal_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "deliverable_brief"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_proposal_contractor_party_id_fkey"
            columns: ["contractor_party_id"]
            isOneToOne: false
            referencedRelation: "party_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_brief: {
        Row: {
          category: string
          collateral_cutoff_at: string | null
          collection_lead_business_days: number
          created_at: string
          created_by: string
          deliverable_id: string
          description: string
          id: string
          name: string
          project_id: string
          proposal_deadline: string | null
          required_formats: string[]
          requirements: string
          revision: number
        }
        Insert: {
          category: string
          collateral_cutoff_at?: string | null
          collection_lead_business_days?: number
          created_at?: string
          created_by: string
          deliverable_id: string
          description?: string
          id?: string
          name: string
          project_id: string
          proposal_deadline?: string | null
          required_formats?: string[]
          requirements?: string
          revision?: number
        }
        Update: {
          category?: string
          collateral_cutoff_at?: string | null
          collection_lead_business_days?: number
          created_at?: string
          created_by?: string
          deliverable_id?: string
          description?: string
          id?: string
          name?: string
          project_id?: string
          proposal_deadline?: string | null
          required_formats?: string[]
          requirements?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_brief_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_message: {
        Row: {
          attachment_names: string[]
          body: string
          created_at: string
          id: string
          sender_user_id: string
          thread_id: string
        }
        Insert: {
          attachment_names?: string[]
          body?: string
          created_at?: string
          id?: string
          sender_user_id: string
          thread_id: string
        }
        Update: {
          attachment_names?: string[]
          body?: string
          created_at?: string
          id?: string
          sender_user_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_message_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "deliverable_thread"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_revision: {
        Row: {
          approved_at: string
          approved_by: string
          deliverable_id: string
          id: string
          project_id: string
          proposal_revision_id: string | null
          revision: number
          snapshot: Json
          source: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          deliverable_id: string
          id?: string
          project_id: string
          proposal_revision_id?: string | null
          revision: number
          snapshot: Json
          source: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          deliverable_id?: string
          id?: string
          project_id?: string
          proposal_revision_id?: string | null
          revision?: number
          snapshot?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_revision_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_revision_proposal_revision_id_fkey"
            columns: ["proposal_revision_id"]
            isOneToOne: false
            referencedRelation: "proposal_revision"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_thread: {
        Row: {
          contractor_party_id: string
          created_at: string
          deliverable_id: string
          delivery_status: string
          id: string
          owner_user_id: string
          project_id: string
          proposal_id: string
          updated_at: string
        }
        Insert: {
          contractor_party_id: string
          created_at?: string
          deliverable_id: string
          delivery_status?: string
          id?: string
          owner_user_id: string
          project_id: string
          proposal_id: string
          updated_at?: string
        }
        Update: {
          contractor_party_id?: string
          created_at?: string
          deliverable_id?: string
          delivery_status?: string
          id?: string
          owner_user_id?: string
          project_id?: string
          proposal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_thread_contractor_party_id_fkey"
            columns: ["contractor_party_id"]
            isOneToOne: false
            referencedRelation: "party_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_thread_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_thread_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "contractor_proposal"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          next_attempt_at: string | null
          payload: Json
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          template: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          template: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      party_directory: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          organisation_name: string
          owner_user_id: string
          phone: string | null
          portal_enabled: boolean
          representative_name: string
          role: string
          updated_at: string
          website: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          organisation_name: string
          owner_user_id: string
          phone?: string | null
          portal_enabled?: boolean
          representative_name?: string
          role: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          organisation_name?: string
          owner_user_id?: string
          phone?: string | null
          portal_enabled?: boolean
          representative_name?: string
          role?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      project: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_party: {
        Row: {
          created_at: string
          id: string
          party_id: string
          project_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          project_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_party_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_party_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_share_link: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          first_viewed_at: string | null
          hidden_contact_fields: string[]
          id: string
          last_viewed_at: string | null
          project_id: string
          provider_name: string
          revoked_at: string | null
          token_hash: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          first_viewed_at?: string | null
          hidden_contact_fields?: string[]
          id?: string
          last_viewed_at?: string | null
          project_id: string
          provider_name: string
          revoked_at?: string | null
          token_hash: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          first_viewed_at?: string | null
          hidden_contact_fields?: string[]
          id?: string
          last_viewed_at?: string | null
          project_id?: string
          provider_name?: string
          revoked_at?: string | null
          token_hash?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_share_link_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_revision: {
        Row: {
          agency_monthly_cents: number
          agency_one_off_cents: number
          id: string
          media_monthly_cents: number
          media_one_off_cents: number
          months: number
          notes: string
          production_to_be_confirmed: boolean
          production_unit_cents: number
          proposal_id: string
          quantity: number
          revision: number
          setup_business_days: number
          submitted_at: string
          submitted_by: string
          total_cents: number | null
        }
        Insert: {
          agency_monthly_cents?: number
          agency_one_off_cents?: number
          id?: string
          media_monthly_cents?: number
          media_one_off_cents?: number
          months?: number
          notes?: string
          production_to_be_confirmed?: boolean
          production_unit_cents?: number
          proposal_id: string
          quantity?: number
          revision: number
          setup_business_days?: number
          submitted_at?: string
          submitted_by: string
          total_cents?: number | null
        }
        Update: {
          agency_monthly_cents?: number
          agency_one_off_cents?: number
          id?: string
          media_monthly_cents?: number
          media_one_off_cents?: number
          months?: number
          notes?: string
          production_to_be_confirmed?: boolean
          production_unit_cents?: number
          proposal_id?: string
          quantity?: number
          revision?: number
          setup_business_days?: number
          submitted_at?: string
          submitted_by?: string
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_revision_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "contractor_proposal"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_variation: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          id: string
          proposal_id: string
          reason: string
          revision: number
          status: string
          submitted_at: string
          submitted_by: string
          values: Json
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          proposal_id: string
          reason: string
          revision: number
          status?: string
          submitted_at?: string
          submitted_by: string
          values: Json
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          proposal_id?: string
          reason?: string
          revision?: number
          status?: string
          submitted_at?: string
          submitted_by?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "proposal_variation_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "contractor_proposal"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          job_title: string
          onboarding_completed_at: string | null
          organisation_name: string
          phone: string
          updated_at: string
          user_id: string
          welcome_email_queued_at: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          job_title?: string
          onboarding_completed_at?: string | null
          organisation_name?: string
          phone?: string
          updated_at?: string
          user_id: string
          welcome_email_queued_at?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          job_title?: string
          onboarding_completed_at?: string | null
          organisation_name?: string
          phone?: string
          updated_at?: string
          user_id?: string
          welcome_email_queued_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_proposal: {
        Args: { target_proposal_id: string }
        Returns: boolean
      }
      can_access_thread: {
        Args: { target_thread_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_party_user: { Args: { target_party_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owns_project: { Args: { target_project_id: string }; Returns: boolean }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
