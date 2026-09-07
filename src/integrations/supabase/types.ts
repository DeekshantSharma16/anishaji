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
      blocked_slots: {
        Row: {
          block_date: string
          block_time: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          block_date: string
          block_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          block_date?: string
          block_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_attempts: {
        Row: {
          client_hash: string
          created_at: string
          id: number
        }
        Insert: {
          client_hash: string
          created_at?: string
          id?: number
        }
        Update: {
          client_hash?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          client_hash: string | null
          client_name: string
          confirmed_at: string | null
          created_at: string
          email: string
          google_event_id: string | null
          id: string
          intake_token: string | null
          internal_notes: string | null
          location: string
          manage_token: string
          notes: string | null
          package_code: string | null
          phone: string | null
          service: string
          session_date: string
          session_time: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          client_hash?: string | null
          client_name: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          google_event_id?: string | null
          id?: string
          intake_token?: string | null
          internal_notes?: string | null
          location?: string
          manage_token: string
          notes?: string | null
          package_code?: string | null
          phone?: string | null
          service: string
          session_date: string
          session_time: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          client_hash?: string | null
          client_name?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          google_event_id?: string | null
          id?: string
          intake_token?: string | null
          internal_notes?: string | null
          location?: string
          manage_token?: string
          notes?: string | null
          package_code?: string | null
          phone?: string | null
          service?: string
          session_date?: string
          session_time?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          account_email: string | null
          calendar_id: string
          connected_at: string
          expires_at: string | null
          id: boolean
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          calendar_id?: string
          connected_at?: string
          expires_at?: string | null
          id?: boolean
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          calendar_id?: string
          connected_at?: string
          expires_at?: string | null
          id?: boolean
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_packages: {
        Row: {
          client_name: string
          code: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          label: string
          notes: string | null
          package_key: string
          sessions_total: number
          sessions_used: number
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          code: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          label: string
          notes?: string | null
          package_key: string
          sessions_total: number
          sessions_used?: number
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          code?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          package_key?: string
          sessions_total?: number
          sessions_used?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          answers: Json
          booking_id: string
          created_at: string
          id: string
          submitted_at: string
        }
        Insert: {
          answers?: Json
          booking_id: string
          created_at?: string
          id?: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          booking_id?: string
          created_at?: string
          id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      review_summary: {
        Row: {
          fetched_at: string | null
          id: boolean
          profile_url: string | null
          rating: number | null
          total_reviews: number | null
        }
        Insert: {
          fetched_at?: string | null
          id?: boolean
          profile_url?: string | null
          rating?: number | null
          total_reviews?: number | null
        }
        Update: {
          fetched_at?: string | null
          id?: boolean
          profile_url?: string | null
          rating?: number | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          author_photo: string | null
          body: string
          created_at: string
          external_id: string | null
          fetched_at: string | null
          id: string
          position: number
          published: boolean
          rating: number
          relative_time: string | null
          source: string
        }
        Insert: {
          author_name: string
          author_photo?: string | null
          body: string
          created_at?: string
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          position?: number
          published?: boolean
          rating?: number
          relative_time?: string | null
          source?: string
        }
        Update: {
          author_name?: string
          author_photo?: string | null
          body?: string
          created_at?: string
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          position?: number
          published?: boolean
          rating?: number
          relative_time?: string | null
          source?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          id: string
          updated_at: string
        }
        Insert: {
          content: Json
          id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          client_name: string
          created_at: string
          email: string
          id: string
          notified_at: string | null
          phone: string | null
          service: string | null
          session_date: string
          session_time: string | null
          status: string
        }
        Insert: {
          client_name: string
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          phone?: string | null
          service?: string | null
          session_date: string
          session_time?: string | null
          status?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          phone?: string | null
          service?: string | null
          session_date?: string
          session_time?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      prune_booking_attempts: { Args: never; Returns: undefined }
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
