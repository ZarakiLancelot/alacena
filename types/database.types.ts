export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      alertas_config: {
        Row: {
          activa: boolean
          created_at: string
          dias_antes: number
          hogar_id: string
          id: string
          user_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          dias_antes?: number
          hogar_id: string
          id?: string
          user_id?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          dias_antes?: number
          hogar_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_config_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      cadenas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          alerta_enviada_at: string | null
          cantidad: number
          consumido: boolean
          created_at: string
          created_by: string
          fecha_compra: string
          fecha_consumo: string | null
          fecha_vencimiento: string | null
          hogar_id: string
          id: string
          precio_normal: number
          precio_oferta: number | null
          presentacion_id: string
          tienda_id: string
        }
        Insert: {
          alerta_enviada_at?: string | null
          cantidad?: number
          consumido?: boolean
          created_at?: string
          created_by?: string
          fecha_compra?: string
          fecha_consumo?: string | null
          fecha_vencimiento?: string | null
          hogar_id: string
          id?: string
          precio_normal: number
          precio_oferta?: number | null
          presentacion_id: string
          tienda_id: string
        }
        Update: {
          alerta_enviada_at?: string | null
          cantidad?: number
          consumido?: boolean
          created_at?: string
          created_by?: string
          fecha_compra?: string
          fecha_consumo?: string | null
          fecha_vencimiento?: string | null
          hogar_id?: string
          id?: string
          precio_normal?: number
          precio_oferta?: number | null
          presentacion_id?: string
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_presentacion_id_fkey"
            columns: ["presentacion_id"]
            isOneToOne: false
            referencedRelation: "presentaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_presentacion_id_fkey"
            columns: ["presentacion_id"]
            isOneToOne: false
            referencedRelation: "vista_precio_unitario"
            referencedColumns: ["presentacion_id"]
          },
          {
            foreignKeyName: "compras_presentacion_id_fkey"
            columns: ["presentacion_id"]
            isOneToOne: false
            referencedRelation: "vista_stock_actual"
            referencedColumns: ["presentacion_id"]
          },
          {
            foreignKeyName: "compras_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "vista_precio_unitario"
            referencedColumns: ["tienda_id"]
          },
        ]
      }
      hogar_miembros: {
        Row: {
          hogar_id: string
          id: string
          joined_at: string
          rol: string
          user_id: string
        }
        Insert: {
          hogar_id: string
          id?: string
          joined_at?: string
          rol?: string
          user_id: string
        }
        Update: {
          hogar_id?: string
          id?: string
          joined_at?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hogar_miembros_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      hogares: {
        Row: {
          codigo_invitacion: string
          created_at: string
          created_by: string | null
          id: string
          nombre: string
        }
        Insert: {
          codigo_invitacion?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
        }
        Update: {
          codigo_invitacion?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      presentaciones: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          producto_id: string
          tamaño: number
          unidad: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id: string
          tamaño: number
          unidad: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          producto_id?: string
          tamaño?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "vista_precio_unitario"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "presentaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "vista_stock_actual"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      productos: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          id: string
          marca: string | null
          nombre: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          nombre: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nombre_completo: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nombre_completo?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tiendas: {
        Row: {
          cadena_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          ubicacion: string | null
        }
        Insert: {
          cadena_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          ubicacion?: string | null
        }
        Update: {
          cadena_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "cadenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiendas_cadena_id_fkey"
            columns: ["cadena_id"]
            isOneToOne: false
            referencedRelation: "vista_precio_unitario"
            referencedColumns: ["cadena_id"]
          },
        ]
      }
    }
    Views: {
      vista_alertas_vencimiento: {
        Row: {
          alerta_enviada_at: string | null
          compra_id: string | null
          dias_antes: number | null
          dias_para_vencer: number | null
          fecha_vencimiento: string | null
          hogar_id: string | null
          producto_nombre: string | null
          tienda_nombre: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_precio_unitario: {
        Row: {
          cadena_id: string | null
          cadena_nombre: string | null
          categoria: string | null
          compra_id: string | null
          created_by: string | null
          fecha_compra: string | null
          hogar_id: string | null
          marca: string | null
          precio_normal: number | null
          precio_oferta: number | null
          precio_pagado: number | null
          precio_por_unidad: number | null
          presentacion_id: string | null
          producto_id: string | null
          producto_nombre: string | null
          tamaño: number | null
          tienda_id: string | null
          tienda_nombre: string | null
          tienda_ubicacion: string | null
          unidad: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_stock_actual: {
        Row: {
          cantidad_total_pendiente: number | null
          categoria: string | null
          compras_pendientes: number | null
          hogar_id: string | null
          marca: string | null
          presentacion_id: string | null
          producto_id: string | null
          producto_nombre: string | null
          proxima_fecha_vencimiento: string | null
          tamaño: number | null
          unidad: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calcular_precio_unitario: {
        Args: { precio: number; tamano: number }
        Returns: number
      }
      comparte_hogar_con: { Args: { p_user_id: string }; Returns: boolean }
      es_miembro_de_hogar: { Args: { p_hogar_id: string }; Returns: boolean }
      es_owner_de_hogar: { Args: { p_hogar_id: string }; Returns: boolean }
      generar_codigo_invitacion: { Args: never; Returns: string }
      regenerar_codigo_hogar: { Args: { p_hogar_id: string }; Returns: string }
      unirse_a_hogar: { Args: { p_codigo: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

