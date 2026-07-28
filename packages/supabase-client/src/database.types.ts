export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          dossier_id: string;
          id: string;
          target_id: string | null;
        };
        Insert: {
          action_type: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          dossier_id: string;
          id?: string;
          target_id?: string | null;
        };
        Update: {
          action_type?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          dossier_id?: string;
          id?: string;
          target_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          created_at: string;
          dossier_id: string;
          id: string;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          created_at?: string;
          dossier_id: string;
          id?: string;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          created_at?: string;
          dossier_id?: string;
          id?: string;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "answers_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
        ];
      };
      benefits: {
        Row: {
          active: boolean;
          caution_text: string;
          code: string;
          created_at: string;
          estimated_amount: string | null;
          form_url: string;
          id: string;
          last_verified_date: string;
          main_condition: string;
          organization: string;
          source_url: string;
          time_window: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          caution_text: string;
          code: string;
          created_at?: string;
          estimated_amount?: string | null;
          form_url: string;
          id?: string;
          last_verified_date: string;
          main_condition: string;
          organization: string;
          source_url: string;
          time_window: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          caution_text?: string;
          code?: string;
          created_at?: string;
          estimated_amount?: string | null;
          form_url?: string;
          id?: string;
          last_verified_date?: string;
          main_condition?: string;
          organization?: string;
          source_url?: string;
          time_window?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catalog_history: {
        Row: {
          action: string;
          catalog_table: string;
          created_at: string;
          id: string;
          modified_by: string | null;
          new_content: Json | null;
          old_content: Json | null;
          row_id: string;
        };
        Insert: {
          action: string;
          catalog_table: string;
          created_at?: string;
          id?: string;
          modified_by?: string | null;
          new_content?: Json | null;
          old_content?: Json | null;
          row_id: string;
        };
        Update: {
          action?: string;
          catalog_table?: string;
          created_at?: string;
          id?: string;
          modified_by?: string | null;
          new_content?: Json | null;
          old_content?: Json | null;
          row_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_history_modified_by_fkey";
            columns: ["modified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string | null;
          content: string;
          created_at: string;
          deleted_at: string | null;
          dossier_id: string;
          id: string;
          mentions: string[];
          procedure_id: string | null;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          dossier_id: string;
          id?: string;
          mentions?: string[];
          procedure_id?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          dossier_id?: string;
          id?: string;
          mentions?: string[];
          procedure_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      conditions: {
        Row: {
          benefit_id: string | null;
          created_at: string;
          expression: Json;
          id: string;
          procedure_id: string | null;
          updated_at: string;
        };
        Insert: {
          benefit_id?: string | null;
          created_at?: string;
          expression: Json;
          id?: string;
          procedure_id?: string | null;
          updated_at?: string;
        };
        Update: {
          benefit_id?: string | null;
          created_at?: string;
          expression?: Json;
          id?: string;
          procedure_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conditions_benefit_id_fkey";
            columns: ["benefit_id"];
            isOneToOne: false;
            referencedRelation: "benefits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conditions_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      contracts: {
        Row: {
          company: string;
          contract_number: string | null;
          contract_type: string;
          created_at: string;
          dossier_id: string;
          id: string;
          known_beneficiaries: string | null;
          updated_at: string;
        };
        Insert: {
          company: string;
          contract_number?: string | null;
          contract_type: string;
          created_at?: string;
          dossier_id: string;
          id?: string;
          known_beneficiaries?: string | null;
          updated_at?: string;
        };
        Update: {
          company?: string;
          contract_number?: string | null;
          contract_type?: string;
          created_at?: string;
          dossier_id?: string;
          id?: string;
          known_beneficiaries?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          added_by: string | null;
          category: string;
          created_at: string;
          deleted_at: string | null;
          dossier_id: string;
          id: string;
          mime_type: string;
          original_name: string;
          size_bytes: number;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          added_by?: string | null;
          category: string;
          created_at?: string;
          deleted_at?: string | null;
          dossier_id: string;
          id?: string;
          mime_type: string;
          original_name: string;
          size_bytes: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          added_by?: string | null;
          category?: string;
          created_at?: string;
          deleted_at?: string | null;
          dossier_id?: string;
          id?: string;
          mime_type?: string;
          original_name?: string;
          size_bytes?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
        ];
      };
      dossiers: {
        Row: {
          activation_frozen_at: string | null;
          activation_frozen_reason: string | null;
          created_at: string;
          created_by: string | null;
          death_date: string | null;
          deleted_at: string | null;
          id: string;
          pending_activation_death_date: string | null;
          pending_activation_document_path: string | null;
          pending_activation_effective_at: string | null;
          pending_activation_opposed_at: string | null;
          pending_activation_opposed_by: string | null;
          pending_activation_requested_at: string | null;
          pending_activation_requested_by: string | null;
          status: string;
          subject_first_name: string;
          subject_last_name: string;
          updated_at: string;
        };
        Insert: {
          activation_frozen_at?: string | null;
          activation_frozen_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          death_date?: string | null;
          deleted_at?: string | null;
          id?: string;
          pending_activation_death_date?: string | null;
          pending_activation_document_path?: string | null;
          pending_activation_effective_at?: string | null;
          pending_activation_opposed_at?: string | null;
          pending_activation_opposed_by?: string | null;
          pending_activation_requested_at?: string | null;
          pending_activation_requested_by?: string | null;
          status?: string;
          subject_first_name: string;
          subject_last_name: string;
          updated_at?: string;
        };
        Update: {
          activation_frozen_at?: string | null;
          activation_frozen_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          death_date?: string | null;
          deleted_at?: string | null;
          id?: string;
          pending_activation_death_date?: string | null;
          pending_activation_document_path?: string | null;
          pending_activation_effective_at?: string | null;
          pending_activation_opposed_at?: string | null;
          pending_activation_opposed_by?: string | null;
          pending_activation_requested_at?: string | null;
          pending_activation_requested_by?: string | null;
          status?: string;
          subject_first_name?: string;
          subject_last_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dossiers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossiers_pending_activation_opposed_by_fkey";
            columns: ["pending_activation_opposed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossiers_pending_activation_requested_by_fkey";
            columns: ["pending_activation_requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          dossier_id: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          message: string | null;
          revoked_at: string | null;
          role: string;
          token_hash: string;
          updated_at: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          dossier_id: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          message?: string | null;
          revoked_at?: string | null;
          role: string;
          token_hash: string;
          updated_at?: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          dossier_id?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          message?: string | null;
          revoked_at?: string | null;
          role?: string;
          token_hash?: string;
          updated_at?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      letter_templates: {
        Row: {
          body_template: string;
          created_at: string;
          id: string;
          last_verified_date: string;
          procedure_id: string;
          source_url: string | null;
          title: string;
          updated_at: string;
          variables: Json;
        };
        Insert: {
          body_template: string;
          created_at?: string;
          id?: string;
          last_verified_date: string;
          procedure_id: string;
          source_url?: string | null;
          title: string;
          updated_at?: string;
          variables?: Json;
        };
        Update: {
          body_template?: string;
          created_at?: string;
          id?: string;
          last_verified_date?: string;
          procedure_id?: string;
          source_url?: string | null;
          title?: string;
          updated_at?: string;
          variables?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "letter_templates_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          dossier_id: string;
          id: string;
          invited_by: string | null;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dossier_id: string;
          id?: string;
          invited_by?: string | null;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dossier_id?: string;
          id?: string;
          invited_by?: string | null;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          email: boolean;
          event_type: string;
          in_app: boolean;
          user_id: string;
        };
        Insert: {
          email: boolean;
          event_type: string;
          in_app: boolean;
          user_id: string;
        };
        Update: {
          email?: boolean;
          event_type?: string;
          in_app?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          dossier_id: string | null;
          email_attempts: number;
          email_last_attempt_at: string | null;
          email_status: string;
          id: string;
          payload: Json;
          read: boolean;
          target_id: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dossier_id?: string | null;
          email_attempts?: number;
          email_last_attempt_at?: string | null;
          email_status?: string;
          id?: string;
          payload?: Json;
          read?: boolean;
          target_id?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dossier_id?: string | null;
          email_attempts?: number;
          email_last_attempt_at?: string | null;
          email_status?: string;
          id?: string;
          payload?: Json;
          read?: boolean;
          target_id?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      preparation_wishes: {
        Row: {
          document_location: string | null;
          dossier_id: string;
          funeral_wishes: string | null;
          people_to_notify: string | null;
          updated_at: string;
        };
        Insert: {
          document_location?: string | null;
          dossier_id: string;
          funeral_wishes?: string | null;
          people_to_notify?: string | null;
          updated_at?: string;
        };
        Update: {
          document_location?: string | null;
          dossier_id?: string;
          funeral_wishes?: string | null;
          people_to_notify?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preparation_wishes_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: true;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
        ];
      };
      procedures: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          delay_days: number | null;
          description: string;
          id: string;
          last_verified_date: string;
          organization: string;
          recipient_address: string | null;
          reference_profession: string | null;
          source_url: string;
          time_window: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          delay_days?: number | null;
          description: string;
          id?: string;
          last_verified_date: string;
          organization: string;
          recipient_address?: string | null;
          reference_profession?: string | null;
          source_url: string;
          time_window: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          delay_days?: number | null;
          description?: string;
          id?: string;
          last_verified_date?: string;
          organization?: string;
          recipient_address?: string | null;
          reference_profession?: string | null;
          source_url?: string;
          time_window?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          first_name: string;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          first_name?: string;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracking: {
        Row: {
          assigned_to: string | null;
          benefit_id: string | null;
          created_at: string;
          dossier_id: string;
          due_date: string | null;
          id: string;
          note: string | null;
          procedure_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          benefit_id?: string | null;
          created_at?: string;
          dossier_id: string;
          due_date?: string | null;
          id?: string;
          note?: string | null;
          procedure_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          benefit_id?: string | null;
          created_at?: string;
          dossier_id?: string;
          due_date?: string | null;
          id?: string;
          note?: string | null;
          procedure_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_benefit_id_fkey";
            columns: ["benefit_id"];
            isOneToOne: false;
            referencedRelation: "benefits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      trusted_contact_designations: {
        Row: {
          activation_expires_at: string | null;
          activation_token_hash: string | null;
          consent_expires_at: string | null;
          consent_token_hash: string | null;
          consented_at: string | null;
          consented_by: string | null;
          created_at: string;
          dossier_id: string;
          email: string;
          future_role: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          updated_at: string;
        };
        Insert: {
          activation_expires_at?: string | null;
          activation_token_hash?: string | null;
          consent_expires_at?: string | null;
          consent_token_hash?: string | null;
          consented_at?: string | null;
          consented_by?: string | null;
          created_at?: string;
          dossier_id: string;
          email: string;
          future_role: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Update: {
          activation_expires_at?: string | null;
          activation_token_hash?: string | null;
          consent_expires_at?: string | null;
          consent_token_hash?: string | null;
          consented_at?: string | null;
          consented_by?: string | null;
          created_at?: string;
          dossier_id?: string;
          email?: string;
          future_role?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trusted_contact_designations_consented_by_fkey";
            columns: ["consented_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trusted_contact_designations_dossier_id_fkey";
            columns: ["dossier_id"];
            isOneToOne: false;
            referencedRelation: "dossiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trusted_contact_designations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_dossier: {
        Args: {
          p_status?: string;
          p_subject_first_name: string;
          p_subject_last_name: string;
        };
        Returns: {
          activation_frozen_at: string | null;
          activation_frozen_reason: string | null;
          created_at: string;
          created_by: string | null;
          death_date: string | null;
          deleted_at: string | null;
          id: string;
          pending_activation_death_date: string | null;
          pending_activation_document_path: string | null;
          pending_activation_effective_at: string | null;
          pending_activation_opposed_at: string | null;
          pending_activation_opposed_by: string | null;
          pending_activation_requested_at: string | null;
          pending_activation_requested_by: string | null;
          status: string;
          subject_first_name: string;
          subject_last_name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "dossiers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_notification: {
        Args: {
          p_actor_id: string;
          p_dossier_id: string;
          p_payload: Json;
          p_target_id: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      delete_own_account: { Args: never; Returns: undefined };
      get_admin_metrics: { Args: never; Returns: Json };
      get_cron_secret: { Args: never; Returns: string };
      has_dossier_access: {
        Args: { p_dossier_id: string; p_min_role?: string };
        Returns: boolean;
      };
      invoke_edge_function: {
        Args: { p_function_name: string };
        Returns: undefined;
      };
      is_admin: { Args: never; Returns: boolean };
      is_dossier_owner: { Args: { p_dossier_id: string }; Returns: boolean };
      log_activity: {
        Args: {
          p_action_type: string;
          p_details: Json;
          p_dossier_id: string;
          p_target_id: string;
        };
        Returns: undefined;
      };
      log_letter_generation: {
        Args: { p_dossier_id: string; p_procedure_id: string };
        Returns: undefined;
      };
      owned_dossier_count: { Args: never; Returns: number };
      purge_soft_deleted: { Args: never; Returns: Json };
      release_activation_freeze: {
        Args: { p_dossier_id: string };
        Returns: undefined;
      };
      resolve_notification_preference: {
        Args: { p_dossier_id: string; p_event_type: string; p_user_id: string };
        Returns: Record<string, unknown>;
      };
      restore_dossier: { Args: { p_dossier_id: string }; Returns: undefined };
      soft_delete_dossier: {
        Args: { p_dossier_id: string };
        Returns: undefined;
      };
      transfer_dossier_ownership: {
        Args: { p_dossier_id: string; p_new_owner_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
