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
      company_mits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mit_number: number
          q1_score: string | null
          title: string
          updated_at: string
          vfo_category: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mit_number: number
          q1_score?: string | null
          title: string
          updated_at?: string
          vfo_category?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mit_number?: number
          q1_score?: string | null
          title?: string
          updated_at?: string
          vfo_category?: string | null
        }
        Relationships: []
      }
      blockers: {
        Row: {
          created_at: string
          department_mit_id: string
          description: string
          id: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_mit_id: string
          description: string
          id?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_mit_id?: string
          description?: string
          id?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockers_department_mit_id_fkey"
            columns: ["department_mit_id"]
            isOneToOne: false
            referencedRelation: "department_mits"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inputs: {
        Row: {
          author_name: string
          blockers: string | null
          carry_forward: boolean
          created_at: string
          department_mit_id: string
          id: string
          input_date: string
          key_decisions: string | null
          milestone_id: string | null
          notes: string | null
          update_text: string
          user_id: string | null
          what_completed: string | null
        }
        Insert: {
          author_name: string
          blockers?: string | null
          carry_forward?: boolean
          created_at?: string
          department_mit_id: string
          id?: string
          input_date?: string
          key_decisions?: string | null
          milestone_id?: string | null
          notes?: string | null
          update_text: string
          user_id?: string | null
          what_completed?: string | null
        }
        Update: {
          author_name?: string
          blockers?: string | null
          carry_forward?: boolean
          created_at?: string
          department_mit_id?: string
          id?: string
          input_date?: string
          key_decisions?: string | null
          milestone_id?: string | null
          notes?: string | null
          update_text?: string
          user_id?: string | null
          what_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_inputs_department_mit_id_fkey"
            columns: ["department_mit_id"]
            isOneToOne: false
            referencedRelation: "department_mits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inputs_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "monthly_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      department_mits: {
        Row: {
          ap_mit_id: string | null
          contributors: string | null
          created_at: string
          current_status: string | null
          department: string
          dependencies: string | null
          green_definition: string | null
          hypothesis: string | null
          id: string
          inputs_activity: string | null
          outputs_results: string | null
          owner: string | null
          problem: string | null
          q1_carryover: string | null
          red_definition: string | null
          title: string
          updated_at: string
          why_this_quarter: string | null
          yellow_definition: string | null
        }
        Insert: {
          ap_mit_id?: string | null
          contributors?: string | null
          created_at?: string
          current_status?: string | null
          department: string
          dependencies?: string | null
          green_definition?: string | null
          hypothesis?: string | null
          id?: string
          inputs_activity?: string | null
          outputs_results?: string | null
          owner?: string | null
          problem?: string | null
          q1_carryover?: string | null
          red_definition?: string | null
          title: string
          updated_at?: string
          why_this_quarter?: string | null
          yellow_definition?: string | null
        }
        Update: {
          ap_mit_id?: string | null
          contributors?: string | null
          created_at?: string
          current_status?: string | null
          department?: string
          dependencies?: string | null
          green_definition?: string | null
          hypothesis?: string | null
          id?: string
          inputs_activity?: string | null
          outputs_results?: string | null
          owner?: string | null
          problem?: string | null
          q1_carryover?: string | null
          red_definition?: string | null
          title?: string
          updated_at?: string
          why_this_quarter?: string | null
          yellow_definition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_mits_ap_mit_id_fkey"
            columns: ["ap_mit_id"]
            isOneToOne: false
            referencedRelation: "company_mits"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_rollup_snapshots: {
        Row: {
          created_at: string
          department_statuses: Json | null
          generated_by: string | null
          id: string
          key_risks: string | null
          key_wins: string | null
          overall_status: string
          recommendations: string | null
          snapshot_date: string
          summary: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          department_statuses?: Json | null
          generated_by?: string | null
          id?: string
          key_risks?: string | null
          key_wins?: string | null
          overall_status?: string
          recommendations?: string | null
          snapshot_date?: string
          summary?: string | null
          week_number: number
        }
        Update: {
          created_at?: string
          department_statuses?: Json | null
          generated_by?: string | null
          id?: string
          key_risks?: string | null
          key_wins?: string | null
          overall_status?: string
          recommendations?: string | null
          snapshot_date?: string
          summary?: string | null
          week_number?: number
        }
        Relationships: []
      }
      monthly_milestones: {
        Row: {
          created_at: string
          department_mit_id: string
          description: string | null
          id: string
          month: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_mit_id: string
          description?: string | null
          id?: string
          month: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_mit_id?: string
          description?: string | null
          id?: string
          month?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_milestones_department_mit_id_fkey"
            columns: ["department_mit_id"]
            isOneToOne: false
            referencedRelation: "department_mits"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_actions: {
        Row: {
          blocker_id: string
          completed_at: string | null
          created_at: string
          department_mit_id: string
          description: string
          due_date: string | null
          id: string
          owner: string
          status: string
          updated_at: string
        }
        Insert: {
          blocker_id: string
          completed_at?: string | null
          created_at?: string
          department_mit_id: string
          description: string
          due_date?: string | null
          id?: string
          owner: string
          status?: string
          updated_at?: string
        }
        Update: {
          blocker_id?: string
          completed_at?: string | null
          created_at?: string
          department_mit_id?: string
          description?: string
          due_date?: string | null
          id?: string
          owner?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_actions_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_actions_department_mit_id_fkey"
            columns: ["department_mit_id"]
            isOneToOne: false
            referencedRelation: "department_mits"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_checkpoints: {
        Row: {
          created_at: string
          department_mit_id: string
          id: string
          milestone_id: string | null
          status: string | null
          summary: string | null
          updated_at: string
          week_end: string
          week_number: number
          week_start: string
        }
        Insert: {
          created_at?: string
          department_mit_id: string
          id?: string
          milestone_id?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          week_end: string
          week_number: number
          week_start: string
        }
        Update: {
          created_at?: string
          department_mit_id?: string
          id?: string
          milestone_id?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          week_end?: string
          week_number?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_checkpoints_department_mit_id_fkey"
            columns: ["department_mit_id"]
            isOneToOne: false
            referencedRelation: "department_mits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_checkpoints_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "monthly_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_rollups: {
        Row: {
          blockers_summary: string | null
          created_at: string
          department: string | null
          generated_at: string
          id: string
          raw_ai_response: string | null
          status_assessment: string | null
          summary: string | null
          themes: string | null
          week_end: string
          week_number: number
          week_start: string
        }
        Insert: {
          blockers_summary?: string | null
          created_at?: string
          department?: string | null
          generated_at?: string
          id?: string
          raw_ai_response?: string | null
          status_assessment?: string | null
          summary?: string | null
          themes?: string | null
          week_end: string
          week_number: number
          week_start: string
        }
        Update: {
          blockers_summary?: string | null
          created_at?: string
          department?: string | null
          generated_at?: string
          id?: string
          raw_ai_response?: string | null
          status_assessment?: string | null
          summary?: string | null
          themes?: string | null
          week_end?: string
          week_number?: number
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
