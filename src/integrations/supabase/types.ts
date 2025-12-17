export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      landing_pages: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          slug: string;
          telegram_invite_link: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          slug: string;
          telegram_invite_link: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          slug?: string;
          telegram_invite_link?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "landing_pages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_configs: {
        Row: {
          api_key: string;
          created_at: string;
          id: string;
          provider: string;
          secret_key: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          api_key: string;
          created_at?: string;
          id?: string;
          provider: string;
          secret_key: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          api_key?: string;
          created_at?: string;
          id?: string;
          provider?: string;
          secret_key?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_configs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_links: {
        Row: {
          amount: number;
          created_at: string | null;
          currency: string;
          id: string;
          landing_page_id: string;
          payment_link_id: string;
          plan_id: string;
          provider: string;
          status: string | null;
          updated_at: string | null;
          user_id: string;
          user_telegram_id: number;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          currency: string;
          id?: string;
          landing_page_id: string;
          payment_link_id: string;
          plan_id: string;
          provider: string;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
          user_telegram_id: number;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          landing_page_id?: string;
          payment_link_id?: string;
          plan_id?: string;
          provider?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
          user_telegram_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "payment_links_landing_page_id_fkey";
            columns: ["landing_page_id"];
            isOneToOne: false;
            referencedRelation: "landing_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_links_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      plans: {
        Row: {
          created_at: string;
          currency: string;
          duration_months: number;
          id: string;
          landing_page_id: string;
          plan_title: string;
          price: number;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          duration_months: number;
          id?: string;
          landing_page_id: string;
          plan_title: string;
          price: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          duration_months?: number;
          id?: string;
          landing_page_id?: string;
          plan_title?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plans_landing_page_id_fkey";
            columns: ["landing_page_id"];
            isOneToOne: false;
            referencedRelation: "landing_pages";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      protected_chats: {
        Row: {
          chat_id: number;
          chat_title: string | null;
          chat_username: string | null;
          chat_type: string | null;
          is_active: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          chat_id: number;
          chat_title?: string | null;
          chat_username?: string | null;
          chat_type?: string | null;
          is_active?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          chat_id?: number;
          chat_title?: string | null;
          chat_username?: string | null;
          chat_type?: string | null;
          is_active?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reminder_logs: {
        Row: {
          id: string;
          user_telegram_id: number;
          chat_id: number;
          day_offset: number;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_telegram_id: number;
          chat_id: number;
          day_offset: number;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_telegram_id?: number;
          chat_id?: number;
          day_offset?: number;
          sent_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_telegram_id: number;
          chat_id: number;
          plan_title: string | null;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_telegram_id: number;
          chat_id: number;
          plan_title?: string | null;
          status?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_telegram_id?: number;
          chat_id?: number;
          plan_title?: string | null;
          status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
