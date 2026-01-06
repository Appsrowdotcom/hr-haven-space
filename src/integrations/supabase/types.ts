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
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          profile_id: string
          status: string
          updated_at: string
          work_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          profile_id: string
          status?: string
          updated_at?: string
          work_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_punches: {
        Row: {
          card_id: string | null
          created_at: string
          device_id: string | null
          device_location: string | null
          id: string
          notes: string | null
          profile_id: string
          punch_time: string
          punch_type: string
          source: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          device_id?: string | null
          device_location?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          punch_time?: string
          punch_type: string
          source?: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          device_id?: string | null
          device_location?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          punch_time?: string
          punch_type?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          size: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_attendance_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          punch_api_enabled: boolean
          punch_api_key: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          punch_api_enabled?: boolean
          punch_api_key: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          punch_api_enabled?: boolean
          punch_api_key?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_attendance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_attendance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          background_color: string | null
          border_radius: string | null
          company_id: string
          created_at: string
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          foreground_color: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          border_radius?: string | null
          company_id: string
          created_at?: string
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          foreground_color?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          border_radius?: string | null
          company_id?: string
          created_at?: string
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          foreground_color?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          company_id: string
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["module_code"]
          settings: Json | null
        }
        Insert: {
          company_id: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module: Database["public"]["Enums"]["module_code"]
          settings?: Json | null
        }
        Update: {
          company_id?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module?: Database["public"]["Enums"]["module_code"]
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          head_id: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_cards: {
        Row: {
          card_id: string
          card_type: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          issued_at: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          card_id: string
          card_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          card_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          date_of_joining: string | null
          designation: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_id: string | null
          employment_type: string | null
          gender: string | null
          id: string
          ifsc_code: string | null
          marital_status: string | null
          nationality: string | null
          pan_number: string | null
          postal_code: string | null
          profile_id: string
          reporting_manager_id: string | null
          state: string | null
          updated_at: string
          work_location: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          designation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          marital_status?: string | null
          nationality?: string | null
          pan_number?: string | null
          postal_code?: string | null
          profile_id: string
          reporting_manager_id?: string | null
          state?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          designation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          marital_status?: string | null
          nationality?: string | null
          pan_number?: string | null
          postal_code?: string | null
          profile_id?: string
          reporting_manager_id?: string | null
          state?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          profile_id: string
          started_at: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          profile_id: string
          started_at?: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          started_at?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          onboarding_id: string
          template_item_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          onboarding_id: string
          template_item_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          onboarding_id?: string
          template_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "employee_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "onboarding_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          ctc: number
          effective_from: string
          effective_to: string | null
          esi_number: string | null
          gross_salary: number
          id: string
          ifsc_code: string | null
          is_active: boolean
          pan_number: string | null
          pf_number: string | null
          profile_id: string
          uan_number: string | null
          updated_at: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ctc?: number
          effective_from?: string
          effective_to?: string | null
          esi_number?: string | null
          gross_salary?: number
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          pan_number?: string | null
          pf_number?: string | null
          profile_id: string
          uan_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ctc?: number
          effective_from?: string
          effective_to?: string | null
          esi_number?: string | null
          gross_salary?: number
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          pan_number?: string | null
          pf_number?: string | null
          profile_id?: string
          uan_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_components: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          employee_salary_id: string
          id: string
        }
        Insert: {
          amount?: number
          component_id: string
          created_at?: string
          employee_salary_id: string
          id?: string
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          employee_salary_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salary_details"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tax_declarations: {
        Row: {
          created_at: string
          financial_year: string
          hra_exemption: number
          id: string
          lta_exemption: number
          other_exemptions: number
          profile_id: string
          regime: string
          section_80c: number
          section_80d: number
          section_80g: number
          status: string
          total_declarations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_year: string
          hra_exemption?: number
          id?: string
          lta_exemption?: number
          other_exemptions?: number
          profile_id: string
          regime?: string
          section_80c?: number
          section_80d?: number
          section_80g?: number
          status?: string
          total_declarations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_year?: string
          hra_exemption?: number
          id?: string
          lta_exemption?: number
          other_exemptions?: number
          profile_id?: string
          regime?: string
          section_80c?: number
          section_80d?: number
          section_80g?: number
          status?: string
          total_declarations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tax_declarations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tax_declarations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tax_declarations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string
          company_id: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          profile_id: string
          receipt_url: string | null
          reimbursed_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          company_id: string
          created_at?: string
          currency?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          profile_id: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          profile_id?: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          accrued_days: number | null
          carry_forward_days: number
          created_at: string
          id: string
          leave_type_id: string
          profile_id: string
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          accrued_days?: number | null
          carry_forward_days?: number
          created_at?: string
          id?: string
          leave_type_id: string
          profile_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          accrued_days?: number | null
          carry_forward_days?: number
          created_at?: string
          id?: string
          leave_type_id?: string
          profile_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          allow_advance_leave: boolean | null
          allow_negative_balance: boolean
          company_id: string
          created_at: string
          emergency_default_unpaid: boolean
          id: string
          leave_credit_start_month: number
          min_days_advance_planned: number
          probation_months: number
          unplanned_default_unpaid: boolean
          updated_at: string
        }
        Insert: {
          allow_advance_leave?: boolean | null
          allow_negative_balance?: boolean
          company_id: string
          created_at?: string
          emergency_default_unpaid?: boolean
          id?: string
          leave_credit_start_month?: number
          min_days_advance_planned?: number
          probation_months?: number
          unplanned_default_unpaid?: boolean
          updated_at?: string
        }
        Update: {
          allow_advance_leave?: boolean | null
          allow_negative_balance?: boolean
          company_id?: string
          created_at?: string
          emergency_default_unpaid?: boolean
          id?: string
          leave_credit_start_month?: number
          min_days_advance_planned?: number
          probation_months?: number
          unplanned_default_unpaid?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_unpaid_reason: string | null
          created_at: string
          end_date: string
          hr_approved: boolean | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          id: string
          is_paid: boolean
          leave_type_id: string
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          profile_id: string
          reason: string | null
          rejection_reason: string | null
          request_type: string
          requires_hr_approval: boolean
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_unpaid_reason?: string | null
          created_at?: string
          end_date: string
          hr_approved?: boolean | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          id?: string
          is_paid?: boolean
          leave_type_id: string
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          profile_id: string
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string
          requires_hr_approval?: boolean
          start_date: string
          status?: string
          total_days: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_unpaid_reason?: string | null
          created_at?: string
          end_date?: string
          hr_approved?: boolean | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          id?: string
          is_paid?: boolean
          leave_type_id?: string
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          profile_id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string
          requires_hr_approval?: boolean
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          company_id: string
          created_at: string
          days_per_year: number
          description: string | null
          id: string
          is_active: boolean
          is_carry_forward: boolean
          is_monthly_quota: boolean
          is_paid: boolean
          max_carry_forward_days: number | null
          monthly_credit: number | null
          monthly_limit: number | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_per_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_carry_forward?: boolean
          is_monthly_quota?: boolean
          is_paid?: boolean
          max_carry_forward_days?: number | null
          monthly_credit?: number | null
          monthly_limit?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_per_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_carry_forward?: boolean
          is_monthly_quota?: boolean
          is_paid?: boolean
          max_carry_forward_days?: number | null
          monthly_credit?: number | null
          monthly_limit?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          profile_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_items: {
        Row: {
          assigned_to_role: string | null
          category: string | null
          created_at: string
          description: string | null
          due_days: number | null
          id: string
          is_required: boolean
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          assigned_to_role?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          is_required?: boolean
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          assigned_to_role?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          is_required?: boolean
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_count: number
          id: string
          notes: string | null
          paid_at: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          total_deductions: number
          total_employer_cost: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_count?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_count?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          esi_employee_rate: number
          esi_employer_rate: number
          esi_enabled: boolean
          esi_limit: number
          id: string
          pay_cycle: string
          pay_day: number
          pf_employee_rate: number
          pf_employer_rate: number
          pf_enabled: boolean
          pf_limit: number
          professional_tax_enabled: boolean
          tds_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          esi_employee_rate?: number
          esi_employer_rate?: number
          esi_enabled?: boolean
          esi_limit?: number
          id?: string
          pay_cycle?: string
          pay_day?: number
          pf_employee_rate?: number
          pf_employer_rate?: number
          pf_enabled?: boolean
          pf_limit?: number
          professional_tax_enabled?: boolean
          tds_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          esi_employee_rate?: number
          esi_employer_rate?: number
          esi_enabled?: boolean
          esi_limit?: number
          id?: string
          pay_cycle?: string
          pay_day?: number
          pf_employee_rate?: number
          pf_employer_rate?: number
          pf_enabled?: boolean
          pf_limit?: number
          professional_tax_enabled?: boolean
          tds_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_items: {
        Row: {
          amount: number
          component_code: string
          component_id: string | null
          component_name: string
          created_at: string
          id: string
          payslip_id: string
          sort_order: number
          type: string
        }
        Insert: {
          amount?: number
          component_code: string
          component_id?: string | null
          component_name: string
          created_at?: string
          id?: string
          payslip_id: string
          sort_order?: number
          type: string
        }
        Update: {
          amount?: number
          component_code?: string
          component_id?: string | null
          component_name?: string
          created_at?: string
          id?: string
          payslip_id?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          days_on_leave: number
          days_worked: number
          department_name: string | null
          designation: string | null
          employee_email: string
          employee_name: string
          employee_salary_id: string | null
          employer_cost: number
          employer_esi: number
          employer_pf: number
          esi_number: string | null
          gross_earnings: number
          id: string
          ifsc_code: string | null
          lop_days: number
          net_pay: number
          pan_number: string | null
          pay_period_end: string
          pay_period_start: string
          payroll_run_id: string
          pf_number: string | null
          profile_id: string
          status: string
          taxable_income: number
          tds_amount: number
          total_deductions: number
          uan_number: string | null
          updated_at: string
          working_days: number
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          days_on_leave?: number
          days_worked?: number
          department_name?: string | null
          designation?: string | null
          employee_email: string
          employee_name: string
          employee_salary_id?: string | null
          employer_cost?: number
          employer_esi?: number
          employer_pf?: number
          esi_number?: string | null
          gross_earnings?: number
          id?: string
          ifsc_code?: string | null
          lop_days?: number
          net_pay?: number
          pan_number?: string | null
          pay_period_end: string
          pay_period_start: string
          payroll_run_id: string
          pf_number?: string | null
          profile_id: string
          status?: string
          taxable_income?: number
          tds_amount?: number
          total_deductions?: number
          uan_number?: string | null
          updated_at?: string
          working_days?: number
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          days_on_leave?: number
          days_worked?: number
          department_name?: string | null
          designation?: string | null
          employee_email?: string
          employee_name?: string
          employee_salary_id?: string | null
          employer_cost?: number
          employer_esi?: number
          employer_pf?: number
          esi_number?: string | null
          gross_earnings?: number
          id?: string
          ifsc_code?: string | null
          lop_days?: number
          net_pay?: number
          pan_number?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payroll_run_id?: string
          pf_number?: string | null
          profile_id?: string
          status?: string
          taxable_income?: number
          tds_amount?: number
          total_deductions?: number
          uan_number?: string | null
          updated_at?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salary_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          module: Database["public"]["Enums"]["module_code"]
          name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          module: Database["public"]["Enums"]["module_code"]
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          module?: Database["public"]["Enums"]["module_code"]
          name?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activated_at: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          deactivated_at: string | null
          department_id: string | null
          email: string
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          full_name: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          department_id?: string | null
          email: string
          employee_category?:
            | Database["public"]["Enums"]["employee_category"]
            | null
          full_name?: string | null
          id: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          department_id?: string | null
          email?: string
          employee_category?:
            | Database["public"]["Enums"]["employee_category"]
            | null
          full_name?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system_role: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          calculation_type: string
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_esi_applicable: boolean
          is_pf_applicable: boolean
          is_system: boolean
          is_taxable: boolean
          name: string
          percentage_of: string | null
          percentage_value: number | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          calculation_type?: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_esi_applicable?: boolean
          is_pf_applicable?: boolean
          is_system?: boolean
          is_taxable?: boolean
          name: string
          percentage_of?: string | null
          percentage_value?: number | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          calculation_type?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_esi_applicable?: boolean
          is_pf_applicable?: boolean
          is_system?: boolean
          is_taxable?: boolean
          name?: string
          percentage_of?: string | null
          percentage_value?: number | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          allowed_modules: string[]
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_departments: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_modules?: string[]
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_departments?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_modules?: string[]
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_departments?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_slabs: {
        Row: {
          company_id: string
          created_at: string
          financial_year: string
          id: string
          is_active: boolean
          max_income: number | null
          min_income: number
          regime: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          financial_year: string
          id?: string
          is_active?: boolean
          max_income?: number | null
          min_income: number
          regime?: string
          tax_rate: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          financial_year?: string
          id?: string
          is_active?: boolean
          max_income?: number | null
          min_income?: number
          regime?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_daily: {
        Row: {
          check_in: string | null
          check_out: string | null
          company_id: string | null
          created_at: string | null
          date: string | null
          department_id: string | null
          department_name: string | null
          designation: string | null
          employee_email: string | null
          employee_name: string | null
          id: string | null
          is_late: boolean | null
          notes: string | null
          overtime_hours: number | null
          profile_id: string | null
          status: string | null
          work_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_monthly_summary: {
        Row: {
          avg_work_hours: number | null
          company_id: string | null
          days_absent: number | null
          days_half: number | null
          days_on_leave: number | null
          days_present: number | null
          department_id: string | null
          department_name: string | null
          employee_email: string | null
          employee_name: string | null
          month: number | null
          profile_id: string | null
          total_days_recorded: number | null
          total_work_hours: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_punch_details: {
        Row: {
          card_id: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          department_name: string | null
          device_id: string | null
          device_location: string | null
          employee_email: string | null
          employee_name: string | null
          id: string | null
          notes: string | null
          profile_id: string | null
          punch_date: string | null
          punch_time: string | null
          punch_type: string | null
          source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_details: {
        Row: {
          action: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_module_status: {
        Row: {
          company_id: string | null
          company_name: string | null
          enabled_at: string | null
          enabled_by: string | null
          enabled_by_name: string | null
          id: string | null
          is_enabled: boolean | null
          module: Database["public"]["Enums"]["module_code"] | null
          settings: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_overview: {
        Row: {
          active_users: number | null
          billing_cycle: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          department_count: number | null
          id: string | null
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          max_departments: number | null
          max_users: number | null
          name: string | null
          plan_name: string | null
          size: string | null
          subscription_status: string | null
          total_users: number | null
          trial_ends_at: string | null
        }
        Relationships: []
      }
      department_summary: {
        Row: {
          active_employee_count: number | null
          company_id: string | null
          description: string | null
          head_email: string | null
          head_id: string | null
          head_name: string | null
          id: string | null
          name: string | null
          parent_department_name: string | null
          parent_id: string | null
          total_employee_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_directory: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          date_of_joining: string | null
          department_id: string | null
          department_name: string | null
          designation: string | null
          email: string | null
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          employee_id: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          work_location: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profile_complete: {
        Row: {
          activated_at: string | null
          address: string | null
          avatar_url: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          date_of_joining: string | null
          deactivated_at: string | null
          department_description: string | null
          department_id: string | null
          department_name: string | null
          designation: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          employee_id: string | null
          employment_type: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          marital_status: string | null
          months_employed: number | null
          nationality: string | null
          phone: string | null
          postal_code: string | null
          reporting_manager_email: string | null
          reporting_manager_id: string | null
          reporting_manager_name: string | null
          state: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          work_location: string | null
          years_employed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_details: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          company_id: string | null
          created_at: string | null
          ctc: number | null
          department_id: string | null
          department_name: string | null
          designation: string | null
          effective_from: string | null
          effective_to: string | null
          employee_email: string | null
          employee_id: string | null
          employee_name: string | null
          esi_number: string | null
          gross_salary: number | null
          id: string | null
          ifsc_code: string | null
          is_active: boolean | null
          pan_number: string | null
          pf_number: string | null
          profile_id: string | null
          uan_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance_summary: {
        Row: {
          accrued_days: number | null
          carry_forward_days: number | null
          company_id: string | null
          days_per_year: number | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_monthly_quota: boolean | null
          is_paid: boolean | null
          leave_type_description: string | null
          leave_type_id: string | null
          leave_type_name: string | null
          monthly_credit: number | null
          monthly_limit: number | null
          profile_id: string | null
          remaining_days: number | null
          total_days: number | null
          used_days: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_monthly_usage: {
        Row: {
          company_id: string | null
          email: string | null
          full_name: string | null
          is_monthly_quota: boolean | null
          leave_type_id: string | null
          leave_type_name: string | null
          month: number | null
          monthly_limit: number | null
          profile_id: string | null
          remaining_days: number | null
          used_days: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request_details: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_unpaid_reason: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          department_name: string | null
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          employee_email: string | null
          employee_name: string | null
          end_date: string | null
          hr_approved: boolean | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          id: string | null
          is_paid: boolean | null
          leave_type_id: string | null
          leave_type_is_paid: boolean | null
          leave_type_name: string | null
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          profile_id: string | null
          reason: string | null
          rejection_reason: string | null
          request_type: string | null
          requires_hr_approval: boolean | null
          start_date: string | null
          status: string | null
          total_days: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_summary: {
        Row: {
          company_id: string | null
          days_per_year: number | null
          description: string | null
          employees_with_balance: number | null
          id: string | null
          is_active: boolean | null
          is_carry_forward: boolean | null
          is_paid: boolean | null
          max_carry_forward_days: number | null
          monthly_credit: number | null
          name: string | null
          total_days_remaining: number | null
          total_days_used: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_details: {
        Row: {
          company_id: string | null
          created_at: string | null
          hours_ago: number | null
          id: string | null
          is_read: boolean | null
          link: string | null
          message: string | null
          profile_id: string | null
          read_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          title: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_item_details: {
        Row: {
          assigned_to_role: string | null
          category: string | null
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          description: string | null
          due_date: string | null
          due_days: number | null
          employee_name: string | null
          id: string | null
          is_completed: boolean | null
          is_overdue: boolean | null
          is_required: boolean | null
          notes: string | null
          onboarding_id: string | null
          onboarding_started_at: string | null
          profile_id: string | null
          sort_order: number | null
          template_item_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "employee_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "onboarding_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          company_id: string | null
          completed_at: string | null
          completed_items: number | null
          department_id: string | null
          employee_email: string | null
          employee_name: string | null
          id: string | null
          profile_id: string | null
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          template_description: string | null
          template_id: string | null
          template_name: string | null
          total_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_summary: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          company_id: string | null
          created_at: string | null
          employee_count: number | null
          id: string | null
          notes: string | null
          paid_at: string | null
          pay_date: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          processed_at: string | null
          processed_by_name: string | null
          status: string | null
          total_deductions: number | null
          total_employer_cost: number | null
          total_gross: number | null
          total_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_hr_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_unpaid_reason: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          department_name: string | null
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          employee_email: string | null
          employee_name: string | null
          end_date: string | null
          hr_approved: boolean | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          id: string | null
          is_paid: boolean | null
          leave_type_id: string | null
          leave_type_is_paid: boolean | null
          leave_type_name: string | null
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          profile_id: string | null
          reason: string | null
          rejection_reason: string | null
          request_type: string | null
          requires_hr_approval: boolean | null
          start_date: string | null
          status: string | null
          total_days: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_manager_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_unpaid_reason: string | null
          company_id: string | null
          created_at: string | null
          department_head_id: string | null
          department_id: string | null
          department_name: string | null
          employee_category:
            | Database["public"]["Enums"]["employee_category"]
            | null
          employee_email: string | null
          employee_name: string | null
          end_date: string | null
          hr_approved: boolean | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          id: string | null
          is_paid: boolean | null
          leave_type_id: string | null
          leave_type_is_paid: boolean | null
          leave_type_name: string | null
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          profile_id: string | null
          reason: string | null
          rejection_reason: string | null
          request_type: string | null
          requires_hr_approval: boolean | null
          start_date: string | null
          status: string | null
          total_days: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permission_details: {
        Row: {
          company_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string | null
          is_sensitive: boolean | null
          permission_category: string | null
          permission_code: string | null
          permission_description: string | null
          permission_id: string | null
          permission_module: Database["public"]["Enums"]["module_code"] | null
          permission_name: string | null
          role_id: string | null
          role_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_details: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          company_id: string | null
          id: string | null
          is_system_role: boolean | null
          role_description: string | null
          role_id: string | null
          role_is_active: boolean | null
          role_name: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profile_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_accrued_leave: {
        Args: { _leave_type_id: string; _profile_id: string }
        Returns: number
      }
      get_months_employed: { Args: { _profile_id: string }; Returns: number }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_leave_permission: {
        Args: { _permission_code: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_code: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin: { Args: { _user_id: string }; Returns: boolean }
      is_eligible_for_paid_leave: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_module_enabled: {
        Args: {
          _company_id: string
          _module: Database["public"]["Enums"]["module_code"]
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      employee_category: "trainee" | "intern" | "probation" | "confirmed"
      module_code:
        | "HR_CORE"
        | "ATTENDANCE"
        | "LEAVE"
        | "FINANCE"
        | "REVENUE"
        | "SALES_CRM"
        | "COMPLIANCE"
        | "ADMIN"
      user_status: "invited" | "pending" | "active" | "deactivated"
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
      employee_category: ["trainee", "intern", "probation", "confirmed"],
      module_code: [
        "HR_CORE",
        "ATTENDANCE",
        "LEAVE",
        "FINANCE",
        "REVENUE",
        "SALES_CRM",
        "COMPLIANCE",
        "ADMIN",
      ],
      user_status: ["invited", "pending", "active", "deactivated"],
    },
  },
} as const
