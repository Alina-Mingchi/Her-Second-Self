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
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource: string | null
          subject_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource?: string | null
          subject_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource?: string | null
          subject_user_id?: string | null
        }
        Relationships: []
      }
      brain_signals: {
        Row: {
          channels: number | null
          created_at: string
          duration_s: number | null
          format: string
          id: string
          notes: string | null
          recorded_at: string
          sample_rate: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          channels?: number | null
          created_at?: string
          duration_s?: number | null
          format: string
          id?: string
          notes?: string | null
          recorded_at?: string
          sample_rate?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          channels?: number | null
          created_at?: string
          duration_s?: number | null
          format?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          sample_rate?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      consent_templates: {
        Row: {
          body_markdown: string
          created_at: string
          data_type: Database["public"]["Enums"]["data_type"]
          id: string
          is_active: boolean
          title: string
          version: number
        }
        Insert: {
          body_markdown: string
          created_at?: string
          data_type: Database["public"]["Enums"]["data_type"]
          id?: string
          is_active?: boolean
          title: string
          version: number
        }
        Update: {
          body_markdown?: string
          created_at?: string
          data_type?: Database["public"]["Enums"]["data_type"]
          id?: string
          is_active?: boolean
          title?: string
          version?: number
        }
        Relationships: []
      }
      consents: {
        Row: {
          data_type: Database["public"]["Enums"]["data_type"]
          granted_at: string
          id: string
          revoked_at: string | null
          template_version: number
          user_id: string
        }
        Insert: {
          data_type: Database["public"]["Enums"]["data_type"]
          granted_at?: string
          id?: string
          revoked_at?: string | null
          template_version: number
          user_id: string
        }
        Update: {
          data_type?: Database["public"]["Enums"]["data_type"]
          granted_at?: string
          id?: string
          revoked_at?: string | null
          template_version?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          cycle_day: number | null
          cycle_phase: Database["public"]["Enums"]["cycle_phase"] | null
          id: string
          log_date: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: Database["public"]["Enums"]["cycle_phase"] | null
          id?: string
          log_date: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: Database["public"]["Enums"]["cycle_phase"] | null
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dataset_files: {
        Row: {
          bytes: number | null
          created_at: string
          filename: string
          id: string
          kind: string
          rows_ingested: number | null
          sha256: string | null
          storage_path: string
          study_id: string
          uploaded_by: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          filename: string
          id?: string
          kind: string
          rows_ingested?: number | null
          sha256?: string | null
          storage_path: string
          study_id: string
          uploaded_by?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          filename?: string
          id?: string
          kind?: string
          rows_ingested?: number | null
          sha256?: string | null
          storage_path?: string
          study_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_files_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          dua_reference: string | null
          id: string
          kind: Database["public"]["Enums"]["dataset_request_kind"]
          notes: string | null
          requester_id: string
          source: string | null
          status: Database["public"]["Enums"]["dataset_request_status"]
          study_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          dua_reference?: string | null
          id?: string
          kind: Database["public"]["Enums"]["dataset_request_kind"]
          notes?: string | null
          requester_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["dataset_request_status"]
          study_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          dua_reference?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["dataset_request_kind"]
          notes?: string | null
          requester_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["dataset_request_status"]
          study_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_requests_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      ehr_documents: {
        Row: {
          created_at: string
          document_type: string | null
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          recorded_at: string | null
          size_bytes: number | null
          storage_path: string
          subject_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          recorded_at?: string | null
          size_bytes?: number | null
          storage_path: string
          subject_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          recorded_at?: string | null
          size_bytes?: number | null
          storage_path?: string
          subject_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      external_subjects: {
        Row: {
          created_at: string
          demographics: Json
          external_id: string
          id: string
          study_id: string
        }
        Insert: {
          created_at?: string
          demographics?: Json
          external_id: string
          id?: string
          study_id: string
        }
        Update: {
          created_at?: string
          demographics?: Json
          external_id?: string
          id?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_subjects_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      food_photos: {
        Row: {
          ai_items: Json | null
          created_at: string
          id: string
          meal_time: string
          status: string
          storage_path: string
          total_carbs_g: number | null
          total_fat_g: number | null
          total_kcal: number | null
          total_protein_g: number | null
          user_id: string
        }
        Insert: {
          ai_items?: Json | null
          created_at?: string
          id?: string
          meal_time?: string
          status?: string
          storage_path: string
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          user_id: string
        }
        Update: {
          ai_items?: Json | null
          created_at?: string
          id?: string
          meal_time?: string
          status?: string
          storage_path?: string
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_kcal?: number | null
          total_protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      hormone_entries: {
        Row: {
          captured_at: string
          daily_log_id: string | null
          dataset_id: string | null
          external_subject_id: string | null
          hormone: Database["public"]["Enums"]["hormone_kind"]
          id: string
          method: Database["public"]["Enums"]["hormone_method"]
          notes: string | null
          unit: string
          user_id: string | null
          value: number
        }
        Insert: {
          captured_at?: string
          daily_log_id?: string | null
          dataset_id?: string | null
          external_subject_id?: string | null
          hormone: Database["public"]["Enums"]["hormone_kind"]
          id?: string
          method?: Database["public"]["Enums"]["hormone_method"]
          notes?: string | null
          unit: string
          user_id?: string | null
          value: number
        }
        Update: {
          captured_at?: string
          daily_log_id?: string | null
          dataset_id?: string | null
          external_subject_id?: string | null
          hormone?: Database["public"]["Enums"]["hormone_kind"]
          id?: string
          method?: Database["public"]["Enums"]["hormone_method"]
          notes?: string | null
          unit?: string
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "hormone_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hormone_entries_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hormone_entries_external_subject_id_fkey"
            columns: ["external_subject_id"]
            isOneToOne: false
            referencedRelation: "external_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          analyte: string
          collected_at: string
          created_at: string
          id: string
          notes: string | null
          panel: string | null
          unit: string | null
          user_id: string
          value: number
        }
        Insert: {
          analyte: string
          collected_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          panel?: string | null
          unit?: string | null
          user_id: string
          value: number
        }
        Update: {
          analyte?: string
          collected_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          panel?: string | null
          unit?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string | null
          id: string
          locale: string | null
          onboarded: boolean
          pseudonym: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string | null
          onboarded?: boolean
          pseudonym?: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string | null
          onboarded?: boolean
          pseudonym?: string
          updated_at?: string
        }
        Relationships: []
      }
      studies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["study_kind"]
          name: string
          source: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["study_kind"]
          name: string
          source?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["study_kind"]
          name?: string
          source?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      study_participants: {
        Row: {
          enrolled_at: string
          id: string
          role_in_study: string
          study_id: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          role_in_study?: string
          study_id: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          role_in_study?: string
          study_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_participants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_entries: {
        Row: {
          daily_log_id: string | null
          dataset_id: string | null
          external_subject_id: string | null
          free_text: string | null
          id: string
          recorded_at: string
          severity: number
          source: string
          symptom: Database["public"]["Enums"]["symptom_kind"]
          user_id: string | null
        }
        Insert: {
          daily_log_id?: string | null
          dataset_id?: string | null
          external_subject_id?: string | null
          free_text?: string | null
          id?: string
          recorded_at?: string
          severity: number
          source?: string
          symptom: Database["public"]["Enums"]["symptom_kind"]
          user_id?: string | null
        }
        Update: {
          daily_log_id?: string | null
          dataset_id?: string | null
          external_subject_id?: string | null
          free_text?: string | null
          id?: string
          recorded_at?: string
          severity?: number
          source?: string
          symptom?: Database["public"]["Enums"]["symptom_kind"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_entries_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_entries_external_subject_id_fkey"
            columns: ["external_subject_id"]
            isOneToOne: false
            referencedRelation: "external_subjects"
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
      voice_memos: {
        Row: {
          created_at: string
          duration_s: number | null
          extracted_symptoms: Json | null
          id: string
          status: string
          storage_path: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          extracted_symptoms?: Json | null
          id?: string
          status?: string
          storage_path: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          extracted_symptoms?: Json | null
          id?: string
          status?: string
          storage_path?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wearable_samples: {
        Row: {
          created_at: string
          dataset_id: string | null
          external_subject_id: string | null
          id: string
          metric: Database["public"]["Enums"]["wearable_metric"]
          recorded_at: string
          source: Database["public"]["Enums"]["wearable_source"]
          unit: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          external_subject_id?: string | null
          id?: string
          metric: Database["public"]["Enums"]["wearable_metric"]
          recorded_at: string
          source: Database["public"]["Enums"]["wearable_source"]
          unit?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          external_subject_id?: string | null
          id?: string
          metric?: Database["public"]["Enums"]["wearable_metric"]
          recorded_at?: string
          source?: Database["public"]["Enums"]["wearable_source"]
          unit?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "wearable_samples_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wearable_samples_external_subject_id_fkey"
            columns: ["external_subject_id"]
            isOneToOne: false
            referencedRelation: "external_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_consent: {
        Args: {
          _data_type: Database["public"]["Enums"]["data_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_dataset_access: {
        Args: { _actor: string; _study_id: string }
        Returns: boolean
      }
      has_participant_access: {
        Args: { _actor: string; _subject: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "participant" | "researcher" | "admin" | "clinician"
      cycle_phase:
        | "menstrual"
        | "follicular"
        | "ovulatory"
        | "luteal"
        | "unknown"
      data_type:
        | "symptoms"
        | "hormones"
        | "voice"
        | "food"
        | "wearable"
        | "lab"
        | "brain_signal"
      dataset_request_kind: "new_dataset" | "access_request"
      dataset_request_status: "pending" | "approved" | "rejected"
      hormone_kind:
        | "lh"
        | "fsh"
        | "estradiol"
        | "progesterone"
        | "testosterone"
        | "cortisol"
        | "basal_temp"
        | "other"
      hormone_method: "self_test" | "lab" | "wearable"
      study_kind: "participant" | "external_cohort"
      symptom_kind:
        | "migraine"
        | "fatigue"
        | "brain_fog"
        | "mood"
        | "cramps"
        | "sleep"
        | "anxiety"
        | "hot_flash"
        | "headache"
        | "nausea"
        | "other"
      wearable_metric:
        | "sleep_min"
        | "deep_sleep_min"
        | "rem_sleep_min"
        | "hrv"
        | "resting_hr"
        | "steps"
        | "stress"
        | "spo2"
        | "skin_temp"
        | "sleep_score"
        | "hr"
        | "respiratory_rate"
        | "computed_temp"
      wearable_source:
        | "apple_health"
        | "fitbit"
        | "oura"
        | "garmin"
        | "whoop"
        | "csv"
        | "manual"
        | "external_dataset"
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
      app_role: ["participant", "researcher", "admin", "clinician"],
      cycle_phase: [
        "menstrual",
        "follicular",
        "ovulatory",
        "luteal",
        "unknown",
      ],
      data_type: [
        "symptoms",
        "hormones",
        "voice",
        "food",
        "wearable",
        "lab",
        "brain_signal",
      ],
      dataset_request_kind: ["new_dataset", "access_request"],
      dataset_request_status: ["pending", "approved", "rejected"],
      hormone_kind: [
        "lh",
        "fsh",
        "estradiol",
        "progesterone",
        "testosterone",
        "cortisol",
        "basal_temp",
        "other",
      ],
      hormone_method: ["self_test", "lab", "wearable"],
      study_kind: ["participant", "external_cohort"],
      symptom_kind: [
        "migraine",
        "fatigue",
        "brain_fog",
        "mood",
        "cramps",
        "sleep",
        "anxiety",
        "hot_flash",
        "headache",
        "nausea",
        "other",
      ],
      wearable_metric: [
        "sleep_min",
        "deep_sleep_min",
        "rem_sleep_min",
        "hrv",
        "resting_hr",
        "steps",
        "stress",
        "spo2",
        "skin_temp",
        "sleep_score",
        "hr",
        "respiratory_rate",
        "computed_temp",
      ],
      wearable_source: [
        "apple_health",
        "fitbit",
        "oura",
        "garmin",
        "whoop",
        "csv",
        "manual",
        "external_dataset",
      ],
    },
  },
} as const
