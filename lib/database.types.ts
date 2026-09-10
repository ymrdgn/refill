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
          /** Kağıt bir kuruma (aile/işletme) aitse dolu; kişisel kağıtta null */
          org_id: string | null;
          name: string;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id?: string | null;
          name?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          org_id?: string | null;
          name?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          kind: 'family' | 'business';
          owner_id: string;
          plan: 'none' | 'family' | 'business';
          plan_until: string | null;
          seat_limit: number;
          logo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind: 'family' | 'business';
          owner_id: string;
          plan?: 'none' | 'family' | 'business';
          plan_until?: string | null;
          seat_limit?: number;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: 'family' | 'business';
          owner_id?: string;
          plan?: 'none' | 'family' | 'business';
          plan_until?: string | null;
          seat_limit?: number;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          org_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          org_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          org_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
        };
        Relationships: [];
      };
      org_invites: {
        Row: {
          id: string;
          org_id: string;
          token: string;
          created_by: string;
          expires_at: string | null;
          max_uses: number | null;
          uses: number;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          token: string;
          created_by: string;
          expires_at?: string | null;
          max_uses?: number | null;
          uses?: number;
          revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          token?: string;
          created_by?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          uses?: number;
          revoked?: boolean;
          created_at?: string;
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
      entitlements: {
        Row: {
          user_id: string;
          photo_sheets_used: number;
          is_pro: boolean;
          pro_until: string | null;
          /** Satın alınan paket; aile planının kaynağı (bkz. org_plan_active). */
          plan: 'individual' | 'family' | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          photo_sheets_used?: number;
          is_pro?: boolean;
          pro_until?: string | null;
          plan?: 'individual' | 'family' | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          photo_sheets_used?: number;
          is_pro?: boolean;
          pro_until?: string | null;
          plan?: 'individual' | 'family' | null;
          updated_at?: string;
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
    Functions: {
      create_organization: {
        Args: { p_name: string; p_kind?: 'family' | 'business' };
        Returns: string;
      };
      redeem_org_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
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
/**
 * organizations satırı + PostgREST hesaplanmış alanı `plan_active`
 * (sunucudaki plan_active() fonksiyonu; select('*, plan_active') ile gelir).
 * Aile için plan/plan_until sütunları anlamsızdır; aktiflik sahibinin
 * entitlements satırından türetilir. Her zaman bu alana bak.
 */
export type Organization =
  Database['public']['Tables']['organizations']['Row'] & {
    plan_active: boolean;
  };
export type OrgMember = Database['public']['Tables']['org_members']['Row'];
export type OrgInvite = Database['public']['Tables']['org_invites']['Row'];
