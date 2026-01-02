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
      boards: {
        Row: {
          board_type: string | null
          brand: string | null
          created_at: string
          id: string
          length_feet: number | null
          length_inches: number | null
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
          volume_liters: number | null
        }
        Insert: {
          board_type?: string | null
          brand?: string | null
          created_at?: string
          id?: string
          length_feet?: number | null
          length_inches?: number | null
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
          volume_liters?: number | null
        }
        Update: {
          board_type?: string | null
          brand?: string | null
          created_at?: string
          id?: string
          length_feet?: number | null
          length_inches?: number | null
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
          volume_liters?: number | null
        }
        Relationships: []
      }
      favorite_spots: {
        Row: {
          created_at: string
          display_order: number
          id: string
          spot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          spot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          spot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_spots_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      forecast_comment_kooks: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_comment_kooks_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forecast_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forecast_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          spot_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          spot_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          spot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forecast_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_comments_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          home_break: string | null
          id: string
          longest_streak: number | null
          longest_streak_start: string | null
          total_kooks_received: number
          total_shakas_received: number
          updated_at: string
          user_id: string
          years_surfing: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_break?: string | null
          id?: string
          longest_streak?: number | null
          longest_streak_start?: string | null
          total_kooks_received?: number
          total_shakas_received?: number
          updated_at?: string
          user_id: string
          years_surfing?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_break?: string | null
          id?: string
          longest_streak?: number | null
          longest_streak_start?: string | null
          total_kooks_received?: number
          total_shakas_received?: number
          updated_at?: string
          user_id?: string
          years_surfing?: number | null
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      session_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_kooks: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_kooks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_likes: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_likes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          session_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          session_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          session_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_swell_data: {
        Row: {
          created_at: string
          id: string
          session_id: string
          swell_direction: string | null
          swell_height: number | null
          tide_height: number | null
          wind_direction: string | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          swell_direction?: string | null
          swell_height?: number | null
          tide_height?: number | null
          wind_direction?: string | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          swell_direction?: string | null
          swell_height?: number | null
          tide_height?: number | null
          wind_direction?: string | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_swell_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          air_count: number | null
          barrel_count: number | null
          board_id: string | null
          created_at: string
          crowd: string | null
          duration_minutes: number | null
          form: string | null
          gear: string | null
          id: string
          is_public: boolean
          latitude: number | null
          location: string
          longitude: number | null
          notes: string | null
          power: string | null
          rating: string | null
          session_date: string
          shape: string | null
          updated_at: string
          user_id: string
          wave_consistency: string | null
          wave_count: number | null
          wave_height: string | null
        }
        Insert: {
          air_count?: number | null
          barrel_count?: number | null
          board_id?: string | null
          created_at?: string
          crowd?: string | null
          duration_minutes?: number | null
          form?: string | null
          gear?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          notes?: string | null
          power?: string | null
          rating?: string | null
          session_date: string
          shape?: string | null
          updated_at?: string
          user_id: string
          wave_consistency?: string | null
          wave_count?: number | null
          wave_height?: string | null
        }
        Update: {
          air_count?: number | null
          barrel_count?: number | null
          board_id?: string | null
          created_at?: string
          crowd?: string | null
          duration_minutes?: number | null
          form?: string | null
          gear?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          notes?: string | null
          power?: string | null
          rating?: string | null
          session_date?: string
          shape?: string | null
          updated_at?: string
          user_id?: string
          wave_consistency?: string | null
          wave_count?: number | null
          wave_height?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          break_type: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          latitude: number
          location: string
          longitude: number
          name: string
        }
        Insert: {
          break_type?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          latitude: number
          location: string
          longitude: number
          name: string
        }
        Update: {
          break_type?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          latitude?: number
          location?: string
          longitude?: number
          name?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
