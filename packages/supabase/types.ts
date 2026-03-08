// Auto-generated types placeholder
// In production, run: supabase gen types typescript --local > packages/supabase/types.ts

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          plan?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          cover_image_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          cover_image_url?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          cover_image_url?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [];
      };
      plan_sets: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      sheets: {
        Row: {
          id: string;
          plan_set_id: string;
          project_id: string;
          name: string;
          sheet_number: string | null;
          current_version_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_set_id: string;
          project_id: string;
          name: string;
          sheet_number?: string | null;
          current_version_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sheet_number?: string | null;
          current_version_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sheet_versions: {
        Row: {
          id: string;
          sheet_id: string;
          version_number: number;
          file_url: string;
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          page_number: number;
          ocr_data: Record<string, unknown> | null;
          is_current: boolean;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          version_number?: number;
          file_url: string;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          page_number?: number;
          ocr_data?: Record<string, unknown> | null;
          is_current?: boolean;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_number?: number;
          file_url?: string;
          thumbnail_url?: string | null;
          ocr_data?: Record<string, unknown> | null;
          is_current?: boolean;
        };
        Relationships: [];
      };
      annotations: {
        Row: {
          id: string;
          sheet_version_id: string;
          type: string;
          data: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sheet_version_id: string;
          type: string;
          data: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          data?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_categories: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          icon: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          icon?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          sheet_id: string | null;
          category_id: string | null;
          annotation_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          pin_x: number | null;
          pin_y: number | null;
          assignee_id: string | null;
          created_by: string | null;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          estimated_hours: number | null;
          actual_hours: number;
          estimated_cost: number | null;
          actual_cost: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          sheet_id?: string | null;
          category_id?: string | null;
          annotation_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          pin_x?: number | null;
          pin_y?: number | null;
          assignee_id?: string | null;
          created_by?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          estimated_cost?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          sheet_id?: string | null;
          category_id?: string | null;
          annotation_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          pin_x?: number | null;
          pin_y?: number | null;
          assignee_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number;
          estimated_cost?: number | null;
          actual_cost?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      checklists: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_checked: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          is_checked?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string | null;
        };
        Update: {
          name?: string;
          color?: string | null;
        };
        Relationships: [];
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: {};
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          task_id: string | null;
          annotation_id: string | null;
          user_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          annotation_id?: string | null;
          user_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          project_id: string;
          task_id: string | null;
          annotation_id: string | null;
          sheet_id: string | null;
          pin_x: number | null;
          pin_y: number | null;
          file_url: string;
          thumbnail_url: string | null;
          type: string;
          markup_data: Record<string, unknown> | null;
          caption: string | null;
          tags: string[] | null;
          taken_at: string | null;
          taken_by: string | null;
          width: number | null;
          height: number | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          task_id?: string | null;
          annotation_id?: string | null;
          sheet_id?: string | null;
          pin_x?: number | null;
          pin_y?: number | null;
          file_url: string;
          thumbnail_url?: string | null;
          type?: string;
          markup_data?: Record<string, unknown> | null;
          caption?: string | null;
          tags?: string[] | null;
          taken_at?: string | null;
          taken_by?: string | null;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          caption?: string | null;
          tags?: string[] | null;
          markup_data?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Record<string, unknown> | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Record<string, unknown> | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      form_templates: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          type: string;
          schema: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          type: string;
          schema: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          schema?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      form_submissions: {
        Row: {
          id: string;
          template_id: string;
          project_id: string;
          data: Record<string, unknown>;
          status: string;
          submitted_by: string | null;
          reviewed_by: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          project_id: string;
          data: Record<string, unknown>;
          status?: string;
          submitted_by?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Record<string, unknown>;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rfis: {
        Row: {
          id: string;
          project_id: string;
          number: number;
          subject: string;
          question: string;
          answer: string | null;
          status: string;
          requested_by: string | null;
          assigned_to: string | null;
          due_date: string | null;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          subject: string;
          question: string;
          answer?: string | null;
          status?: string;
          requested_by?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          subject?: string;
          question?: string;
          answer?: string | null;
          status?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          answered_at?: string | null;
        };
        Relationships: [];
      };
      timesheets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          task_id: string | null;
          date: string;
          hours: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          task_id?: string | null;
          date: string;
          hours: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          task_id?: string | null;
          date?: string;
          hours?: number;
          description?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          folder_path: string;
          name: string;
          file_url: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          folder_path?: string;
          name: string;
          file_url: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          folder_path?: string;
          file_url?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_schedules: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          filters: Record<string, unknown>;
          schedule_cron: string;
          recipients: string[];
          format: string;
          is_active: boolean;
          last_run_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          filters: Record<string, unknown>;
          schedule_cron: string;
          recipients: string[];
          format?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          filters?: Record<string, unknown>;
          schedule_cron?: string;
          recipients?: string[];
          format?: string;
          is_active?: boolean;
          last_run_at?: string | null;
        };
        Relationships: [];
      };
      exports: {
        Row: {
          id: string;
          project_id: string;
          type: string;
          status: string;
          file_url: string | null;
          config: Record<string, unknown> | null;
          requested_by: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: string;
          status?: string;
          file_url?: string | null;
          config?: Record<string, unknown> | null;
          requested_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          file_url?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      specifications: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          file_url: string;
          file_size: number | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          file_url: string;
          file_size?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          file_url?: string;
          file_size?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          is_superadmin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          is_superadmin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          is_superadmin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
