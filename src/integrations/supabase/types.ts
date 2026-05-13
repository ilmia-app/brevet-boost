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
      annales: {
        Row: {
          annee: number
          corrige_url: string | null
          id: string
          matiere: string
          pdf_url: string
          session: string
          titre: string
        }
        Insert: {
          annee: number
          corrige_url?: string | null
          id?: string
          matiere: string
          pdf_url: string
          session: string
          titre: string
        }
        Update: {
          annee?: number
          corrige_url?: string | null
          id?: string
          matiere?: string
          pdf_url?: string
          session?: string
          titre?: string
        }
        Relationships: []
      }
      blocs_examen: {
        Row: {
          bareme_points_estimes: string | null
          consigne_eleve: string | null
          duree_examen_min: number | null
          duree_min: number | null
          id: string
          iterations_recommandees: number | null
          matiere: string
          methode_id: string | null
          objectifs_pedagogiques: string | null
          phase_min: number | null
          priorite: number | null
          source_annale_1: string | null
          source_annale_2: string | null
          tags: string | null
          theme: string | null
          titre: string
          type: string | null
        }
        Insert: {
          bareme_points_estimes?: string | null
          consigne_eleve?: string | null
          duree_examen_min?: number | null
          duree_min?: number | null
          id: string
          iterations_recommandees?: number | null
          matiere: string
          methode_id?: string | null
          objectifs_pedagogiques?: string | null
          phase_min?: number | null
          priorite?: number | null
          source_annale_1?: string | null
          source_annale_2?: string | null
          tags?: string | null
          theme?: string | null
          titre: string
          type?: string | null
        }
        Update: {
          bareme_points_estimes?: string | null
          consigne_eleve?: string | null
          duree_examen_min?: number | null
          duree_min?: number | null
          id?: string
          iterations_recommandees?: number | null
          matiere?: string
          methode_id?: string | null
          objectifs_pedagogiques?: string | null
          phase_min?: number | null
          priorite?: number | null
          source_annale_1?: string | null
          source_annale_2?: string | null
          tags?: string | null
          theme?: string | null
          titre?: string
          type?: string | null
        }
        Relationships: []
      }
      completions: {
        Row: {
          auto_evaluation: string | null
          bloc_id: string
          completed: boolean
          created_at: string
          date_completion: string
          id: string
          user_id: string
        }
        Insert: {
          auto_evaluation?: string | null
          bloc_id: string
          completed?: boolean
          created_at?: string
          date_completion?: string
          id?: string
          user_id: string
        }
        Update: {
          auto_evaluation?: string | null
          bloc_id?: string
          completed?: boolean
          created_at?: string
          date_completion?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "blocs_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices: {
        Row: {
          annale_source: string | null
          annee: number | null
          bloc_id: string | null
          corrige: string | null
          created_at: string | null
          difficulte: string | null
          enonce: string | null
          explication_ia: string | null
          id: string
          piege_classique: string | null
          session: string | null
          titre: string | null
        }
        Insert: {
          annale_source?: string | null
          annee?: number | null
          bloc_id?: string | null
          corrige?: string | null
          created_at?: string | null
          difficulte?: string | null
          enonce?: string | null
          explication_ia?: string | null
          id: string
          piege_classique?: string | null
          session?: string | null
          titre?: string | null
        }
        Update: {
          annale_source?: string | null
          annee?: number | null
          bloc_id?: string | null
          corrige?: string | null
          created_at?: string | null
          difficulte?: string | null
          enonce?: string | null
          explication_ia?: string | null
          id?: string
          piege_classique?: string | null
          session?: string | null
          titre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercices_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "blocs_examen"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices_bibliotheque: {
        Row: {
          bloc_id: string
          corrige: string
          created_at: string | null
          enonce: string
          formule_cible: string
          id: string
          titre: string
        }
        Insert: {
          bloc_id: string
          corrige: string
          created_at?: string | null
          enonce: string
          formule_cible: string
          id: string
          titre: string
        }
        Update: {
          bloc_id?: string
          corrige?: string
          created_at?: string | null
          enonce?: string
          formule_cible?: string
          id?: string
          titre?: string
        }
        Relationships: []
      }
      exercices_generes: {
        Row: {
          bloc_id: string
          corrige: string
          created_at: string
          created_by: string | null
          enonce: string
          graphique: Json | null
          id: string
          questions: Json | null
        }
        Insert: {
          bloc_id: string
          corrige: string
          created_at?: string
          created_by?: string | null
          enonce: string
          graphique?: Json | null
          id?: string
          questions?: Json | null
        }
        Update: {
          bloc_id?: string
          corrige?: string
          created_at?: string
          created_by?: string | null
          enonce?: string
          graphique?: Json | null
          id?: string
          questions?: Json | null
        }
        Relationships: []
      }
      exercices_vus: {
        Row: {
          exercice_id: string
          id: string
          user_id: string
          vu_at: string
        }
        Insert: {
          exercice_id: string
          id?: string
          user_id: string
          vu_at?: string
        }
        Update: {
          exercice_id?: string
          id?: string
          user_id?: string
          vu_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercices_vus_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices_generes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_feedback: {
        Row: {
          action_associee: string | null
          id: string
          message: string | null
          niveau_taux: string | null
          phase: number | null
          taux_max: string | null
          taux_min: string | null
          ton: string | null
        }
        Insert: {
          action_associee?: string | null
          id: string
          message?: string | null
          niveau_taux?: string | null
          phase?: number | null
          taux_max?: string | null
          taux_min?: string | null
          ton?: string | null
        }
        Update: {
          action_associee?: string | null
          id?: string
          message?: string | null
          niveau_taux?: string | null
          phase?: number | null
          taux_max?: string | null
          taux_min?: string | null
          ton?: string | null
        }
        Relationships: []
      }
      methodes: {
        Row: {
          blocs_associes: string | null
          duree_lecture_min: number | null
          etapes: string | null
          explications_etapes: Json | null
          id: string
          matiere: string | null
          titre: string
        }
        Insert: {
          blocs_associes?: string | null
          duree_lecture_min?: number | null
          etapes?: string | null
          explications_etapes?: Json | null
          id: string
          matiere?: string | null
          titre: string
        }
        Update: {
          blocs_associes?: string | null
          duree_lecture_min?: number | null
          etapes?: string | null
          explications_etapes?: Json | null
          id?: string
          matiere?: string | null
          titre?: string
        }
        Relationships: []
      }
      moteur_ajustement: {
        Row: {
          description: string | null
          parametre: string
          slot_legere: string | null
          slot_lourde: string | null
          slot_moyenne: string | null
          unite: string | null
          valeur: string
        }
        Insert: {
          description?: string | null
          parametre: string
          slot_legere?: string | null
          slot_lourde?: string | null
          slot_moyenne?: string | null
          unite?: string | null
          valeur: string
        }
        Update: {
          description?: string | null
          parametre?: string
          slot_legere?: string | null
          slot_lourde?: string | null
          slot_moyenne?: string | null
          unite?: string | null
          valeur?: string
        }
        Relationships: []
      }
      qcm: {
        Row: {
          bloc_id: string
          created_at: string | null
          difficulte: string | null
          explication: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          reponse_correcte: string
        }
        Insert: {
          bloc_id: string
          created_at?: string | null
          difficulte?: string | null
          explication: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          reponse_correcte: string
        }
        Update: {
          bloc_id?: string
          created_at?: string | null
          difficulte?: string | null
          explication?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          reponse_correcte?: string
        }
        Relationships: []
      }
      qcm_results: {
        Row: {
          bloc_id: string | null
          date_reponse: string | null
          est_correcte: boolean | null
          id: string
          prochaine_revision: string | null
          question: string | null
          reponse_choisie: string | null
          reponse_correcte: string | null
          user_id: string | null
        }
        Insert: {
          bloc_id?: string | null
          date_reponse?: string | null
          est_correcte?: boolean | null
          id?: string
          prochaine_revision?: string | null
          question?: string | null
          reponse_choisie?: string | null
          reponse_correcte?: string | null
          user_id?: string | null
        }
        Update: {
          bloc_id?: string | null
          date_reponse?: string | null
          est_correcte?: boolean | null
          id?: string
          prochaine_revision?: string | null
          question?: string | null
          reponse_choisie?: string | null
          reponse_correcte?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions_travail: {
        Row: {
          answers: Json | null
          bloc_id: string
          bloc_matiere: string | null
          bloc_titre: string | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          enonce: string | null
          id: string
          is_ai_generated: boolean | null
          notes: string | null
          questions: Json | null
          updated_at: string
          user_id: string
          validated: Json | null
        }
        Insert: {
          answers?: Json | null
          bloc_id: string
          bloc_matiere?: string | null
          bloc_titre?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          enonce?: string | null
          id?: string
          is_ai_generated?: boolean | null
          notes?: string | null
          questions?: Json | null
          updated_at?: string
          user_id: string
          validated?: Json | null
        }
        Update: {
          answers?: Json | null
          bloc_id?: string
          bloc_matiere?: string | null
          bloc_titre?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          enonce?: string | null
          id?: string
          is_ai_generated?: boolean | null
          notes?: string | null
          questions?: Json | null
          updated_at?: string
          user_id?: string
          validated?: Json | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          date_examen: string | null
          derniere_activite: string | null
          derniere_modif_priorites: string | null
          email: string | null
          id: string
          jours_travailles: string[] | null
          matieres_faibles: string[] | null
          matieres_fortes: string[] | null
          mode_actuel: string | null
          niveau: string | null
          phase_actuelle: number | null
          prenom: string | null
          retard_cumule_min: number | null
          retard_initial: string | null
          volume_quotidien: string | null
        }
        Insert: {
          created_at?: string | null
          date_examen?: string | null
          derniere_activite?: string | null
          derniere_modif_priorites?: string | null
          email?: string | null
          id: string
          jours_travailles?: string[] | null
          matieres_faibles?: string[] | null
          matieres_fortes?: string[] | null
          mode_actuel?: string | null
          niveau?: string | null
          phase_actuelle?: number | null
          prenom?: string | null
          retard_cumule_min?: number | null
          retard_initial?: string | null
          volume_quotidien?: string | null
        }
        Update: {
          created_at?: string | null
          date_examen?: string | null
          derniere_activite?: string | null
          derniere_modif_priorites?: string | null
          email?: string | null
          id?: string
          jours_travailles?: string[] | null
          matieres_faibles?: string[] | null
          matieres_fortes?: string[] | null
          mode_actuel?: string | null
          niveau?: string | null
          phase_actuelle?: number | null
          prenom?: string | null
          retard_cumule_min?: number | null
          retard_initial?: string | null
          volume_quotidien?: string | null
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
