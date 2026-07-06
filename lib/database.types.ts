/**
 * database.types.ts — Supabase şemasının TypeScript karşılığı.
 *
 * `supabase gen types typescript` çıktısının elle yazılmış eşi
 * (kaynak: refill_claude/schema.sql). Şema değişirse burayı güncelle
 * ya da CLI ile yeniden üret:
 *   supabase gen types typescript --project-id <id> > lib/database.types.ts
 */

/** Oran tabanlı, zaman damgalı kalem izi noktası (0..1) */
export type StrokePoint = { x: number; y: number; t?: number };

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sheets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sheet_rows: {
        Row: {
          id: string;
          sheet_id: string;
          idx: number;
          y: number;
          label: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          idx?: number;
          y: number;
          label?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          idx?: number;
          y?: number;
          label?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          sheet_id: string;
          user_id: string;
          name: string;
          played_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          user_id: string;
          name?: string;
          played_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          user_id?: string;
          name?: string;
          played_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_rows: {
        Row: {
          session_id: string;
          row_id: string;
          value: string;
        };
        Insert: {
          session_id: string;
          row_id: string;
          value?: string;
        };
        Update: {
          session_id?: string;
          row_id?: string;
          value?: string;
        };
        Relationships: [];
      };
      strokes: {
        Row: {
          id: string;
          session_id: string;
          row_id: string | null;
          points: StrokePoint[];
        };
        Insert: {
          id?: string;
          session_id: string;
          row_id?: string | null;
          points: StrokePoint[];
        };
        Update: {
          id?: string;
          session_id?: string;
          row_id?: string | null;
          points?: StrokePoint[];
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

/** Kısayol satır tipleri */
export type Sheet = Database['public']['Tables']['sheets']['Row'];
export type SheetRow = Database['public']['Tables']['sheet_rows']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type SessionRow = Database['public']['Tables']['session_rows']['Row'];
export type Stroke = Database['public']['Tables']['strokes']['Row'];
