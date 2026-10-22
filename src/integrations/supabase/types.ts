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
      blog_posts: {
        Row: {
          category: string | null
          content: string
          content_type: string
          created_at: string
          excerpt: string | null
          author_name: string | null
          faqs: Json
          hero_image_alt: string | null
          id: string
          image_url: string | null
          image_rights_status: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          originality_notes: string | null
          rights_status: string
          reviewed_at: string | null
          slug: string
          source_author: string | null
          source_excerpt: string | null
          source_image_url: string | null
          source_platform: string | null
          source_published_at: string | null
          source_url: string | null
          sources: Json
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          content_type?: string
          created_at?: string
          excerpt?: string | null
          author_name?: string | null
          faqs?: Json
          hero_image_alt?: string | null
          id?: string
          image_url?: string | null
          image_rights_status?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          originality_notes?: string | null
          rights_status?: string
          reviewed_at?: string | null
          slug: string
          source_author?: string | null
          source_excerpt?: string | null
          source_image_url?: string | null
          source_platform?: string | null
          source_published_at?: string | null
          source_url?: string | null
          sources?: Json
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          content_type?: string
          created_at?: string
          excerpt?: string | null
          author_name?: string | null
          faqs?: Json
          hero_image_alt?: string | null
          id?: string
          image_url?: string | null
          image_rights_status?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          originality_notes?: string | null
          rights_status?: string
          reviewed_at?: string | null
          slug?: string
          source_author?: string | null
          source_excerpt?: string | null
          source_image_url?: string | null
          source_platform?: string | null
          source_published_at?: string | null
          source_url?: string | null
          sources?: Json
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          sort_order: number
          store_id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          sort_order?: number
          store_id: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          sort_order?: number
          store_id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string
          deal_price: number | null
          description: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          original_price: number | null
          store_id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          deal_price?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          original_price?: number | null
          store_id: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          deal_price?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          original_price?: number | null
          store_id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          tag_id: string
          tag_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          tag_id: string
          tag_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          tag_id?: string
          tag_type?: string
        }
        Relationships: []
      }
      store_reviews: {
        Row: {
          best_for: string[]
          cons: string[]
          content_sections: Json
          coupon_strategy: Json
          created_at: string
          dek: string | null
          faqs: Json
          generated_at: string
          generated_by: string
          h1: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          model: string | null
          primary_coupon_id: string | null
          pros: string[]
          published_at: string | null
          research_queries: Json
          review_vertical: string
          slug: string | null
          sources: Json
          status: string
          store_id: string
          summary: string
          title: string
          title_candidates: Json
          updated_at: string
          verdict: string | null
        }
        Insert: {
          best_for?: string[]
          cons?: string[]
          content_sections?: Json
          coupon_strategy?: Json
          created_at?: string
          dek?: string | null
          faqs?: Json
          generated_at?: string
          generated_by?: string
          h1?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          primary_coupon_id?: string | null
          pros?: string[]
          published_at?: string | null
          research_queries?: Json
          review_vertical?: string
          slug?: string | null
          sources?: Json
          status?: string
          store_id: string
          summary: string
          title: string
          title_candidates?: Json
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          best_for?: string[]
          cons?: string[]
          content_sections?: Json
          coupon_strategy?: Json
          created_at?: string
          dek?: string | null
          faqs?: Json
          generated_at?: string
          generated_by?: string
          h1?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          primary_coupon_id?: string | null
          pros?: string[]
          published_at?: string | null
          research_queries?: Json
          review_vertical?: string
          slug?: string | null
          sources?: Json
          status?: string
          store_id?: string
          summary?: string
          title?: string
          title_candidates?: Json
          updated_at?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_primary_coupon_id_fkey"
            columns: ["primary_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
          use_code_tips: Json
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
          use_code_tips?: Json
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
          use_code_tips?: Json
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      is_admin: { Args: never; Returns: boolean }
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
