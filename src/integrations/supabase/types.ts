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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string | null
          stage_id: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          stage_id: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          stage_id?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_assets: {
        Row: {
          asset_type: string
          catalog_id: string
          created_at: string
          id: string
          sort_order: number
          storage_bucket: string
          storage_path: string
          workspace_id: string
        }
        Insert: {
          asset_type?: string
          catalog_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_bucket?: string
          storage_path: string
          workspace_id: string
        }
        Update: {
          asset_type?: string
          catalog_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_assets_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_sends: {
        Row: {
          catalog_id: string
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          provider: string
          segment_id: string | null
          sent_by_user_id: string | null
          status: string
          target_type: string
          workspace_id: string
        }
        Insert: {
          catalog_id: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string
          segment_id?: string | null
          sent_by_user_id?: string | null
          status?: string
          target_type: string
          workspace_id: string
        }
        Update: {
          catalog_id?: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string
          segment_id?: string | null
          sent_by_user_id?: string | null
          status?: string
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_sends_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sends_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sends_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sends_sent_by_user_id_fkey"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sends_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_classes: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_classes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          contact_class_id: string | null
          created_at: string
          email: string | null
          group_class_id: string | null
          id: string
          is_real: boolean | null
          is_visible: boolean | null
          name: string
          notes: string | null
          phone: string
          pipeline_id: string | null
          raw_jid: string | null
          source_type: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          contact_class_id?: string | null
          created_at?: string
          email?: string | null
          group_class_id?: string | null
          id?: string
          is_real?: boolean | null
          is_visible?: boolean | null
          name: string
          notes?: string | null
          phone: string
          pipeline_id?: string | null
          raw_jid?: string | null
          source_type?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          contact_class_id?: string | null
          created_at?: string
          email?: string | null
          group_class_id?: string | null
          id?: string
          is_real?: boolean | null
          is_visible?: boolean | null
          name?: string
          notes?: string | null
          phone?: string
          pipeline_id?: string | null
          raw_jid?: string | null
          source_type?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_class_id_fkey"
            columns: ["contact_class_id"]
            isOneToOne: false
            referencedRelation: "contact_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_group_class_id_fkey"
            columns: ["group_class_id"]
            isOneToOne: false
            referencedRelation: "group_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_aliases: {
        Row: {
          alias_remote_jid: string
          conversation_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          whatsapp_number_id: string
          workspace_id: string
        }
        Insert: {
          alias_remote_jid: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          whatsapp_number_id: string
          workspace_id: string
        }
        Update: {
          alias_remote_jid?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          whatsapp_number_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_aliases_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_aliases_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_aliases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_events: {
        Row: {
          actor_user_id: string | null
          conversation_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          provider: string
          provider_event_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          conversation_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_event_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          conversation_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_event_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contact_id: string
          created_at: string
          group_remote_jid: string | null
          id: string
          is_group: boolean | null
          is_typing: boolean | null
          last_message_at: string | null
          pipeline_id: string | null
          remote_jid: string | null
          stage_id: string | null
          unread_count: number | null
          updated_at: string
          whatsapp_number_id: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          group_remote_jid?: string | null
          id?: string
          is_group?: boolean | null
          is_typing?: boolean | null
          last_message_at?: string | null
          pipeline_id?: string | null
          remote_jid?: string | null
          stage_id?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          group_remote_jid?: string | null
          id?: string
          is_group?: boolean | null
          is_typing?: boolean | null
          last_message_at?: string | null
          pipeline_id?: string | null
          remote_jid?: string | null
          stage_id?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_recurrence: {
        Row: {
          avg_days_between_purchases: number | null
          contact_id: string
          last_purchase_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avg_days_between_purchases?: number | null
          contact_id: string
          last_purchase_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avg_days_between_purchases?: number | null
          contact_id?: string
          last_purchase_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_recurrence_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recurrence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      group_classes: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string | null
          conversation_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          external_id: string | null
          id: string
          is_outgoing: boolean | null
          media_path: string | null
          media_type: string | null
          media_url: string | null
          mime_type: string | null
          provider_reply_id: string | null
          quoted_message: Json | null
          reply_to_id: string | null
          sender_jid: string | null
          sent_by_user_id: string | null
          size_bytes: number | null
          status: string | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          type: string | null
          whatsapp_number_id: string | null
          workspace_id: string
        }
        Insert: {
          body: string
          client_id?: string | null
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          is_outgoing?: boolean | null
          media_path?: string | null
          media_type?: string | null
          media_url?: string | null
          mime_type?: string | null
          provider_reply_id?: string | null
          quoted_message?: Json | null
          reply_to_id?: string | null
          sender_jid?: string | null
          sent_by_user_id?: string | null
          size_bytes?: number | null
          status?: string | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          type?: string | null
          whatsapp_number_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: string
          client_id?: string | null
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          is_outgoing?: boolean | null
          media_path?: string | null
          media_type?: string | null
          media_url?: string | null
          mime_type?: string | null
          provider_reply_id?: string | null
          quoted_message?: Json | null
          reply_to_id?: string | null
          sender_jid?: string | null
          sent_by_user_id?: string | null
          size_bytes?: number | null
          status?: string | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          type?: string | null
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_by_user_id_fkey"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          owner_user_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          purchased_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_members: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          segment_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          segment_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          segment_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          workspace_id?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhook_deliveries: {
        Row: {
          delivery_key: string
          error_message: string | null
          event_type: string
          headers: Json | null
          id: string
          instance_name: string | null
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
          workspace_id: string
        }
        Insert: {
          delivery_key: string
          error_message?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          instance_name?: string | null
          payload: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
          workspace_id: string
        }
        Update: {
          delivery_key?: string
          error_message?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          instance_name?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          api_key: string | null
          created_at: string
          id: string
          instance_name: string | null
          internal_name: string
          is_active: boolean | null
          last_connected_at: string | null
          last_qr: string | null
          phone_number: string
          pipeline_preferential_id: string | null
          provider: string
          status: string | null
          updated_at: string
          user_id: string
          webhook_url: string | null
          workspace_id: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          internal_name: string
          is_active?: boolean | null
          last_connected_at?: string | null
          last_qr?: string | null
          phone_number: string
          pipeline_preferential_id?: string | null
          provider?: string
          status?: string | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          internal_name?: string
          is_active?: boolean | null
          last_connected_at?: string | null
          last_qr?: string | null
          phone_number?: string
          pipeline_preferential_id?: string | null
          provider?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_pipeline_preferential_id_fkey"
            columns: ["pipeline_preferential_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rotated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rotated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rotated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          owner_id: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_workspace_for_user: { Args: never; Returns: string }
      get_ad_report_count: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: number
      }
      get_ad_report_kpis: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          ad_conversations: number
          ad_messages: number
          top_conversion_source: string
          total_ad_leads: number
        }[]
      }
      get_ad_report_table: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_offset?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          ad_media_type: number
          ad_source_id: string
          ad_title: string
          automated_greeting_shown: boolean
          conversion_source: string
          entry_point_app: string
          entry_point_source: string
          event_id: string
          event_timestamp: string
          push_name: string
          remote_jid: string
          show_ad_attribution: boolean
        }[]
      }
      get_ad_report_timeseries: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          leads: number
          messages: number
          report_date: string
        }[]
      }
      get_admin_overview_metrics: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: {
          abandoned_conversations: number
          ads_leads: number
          organic_leads: number
          pending_replies: number
          sales_this_month: number
          total_new_leads: number
        }[]
      }
      get_ads_vs_organic_timeseries: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: {
          ads_leads: number
          organic_leads: number
          report_date: string
        }[]
      }
      get_agent_dashboard_metrics: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: {
          leads_in_pipeline: number
          pending_replies: number
          sales_this_month: number
        }[]
      }
      get_agent_performance_ranking: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: {
          agent_name: string
          agent_user_id: string
          avg_response_time_minutes: number
          leads_count: number
          pending_replies: number
          sales_count: number
        }[]
      }
      get_message_report_count: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: number
      }
      get_message_report_kpis: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          active_conversations: number
          messages_received: number
          messages_sent: number
          total_messages: number
          unique_contacts: number
        }[]
      }
      get_message_report_table: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_offset?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          event_id: string
          event_timestamp: string
          from_me: boolean
          message_type: string
          push_name: string
          remote_jid: string
          status: string
        }[]
      }
      get_message_report_timeseries: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          contacts: number
          messages: number
          report_date: string
        }[]
      }
      get_pending_replies_list: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_user_id: string
          p_workspace_id: string
        }
        Returns: {
          contact_name: string
          conversation_id: string
          last_message_at: string
          last_message_body: string
          remote_jid: string
          waiting_minutes: number
        }[]
      }
      get_top_ads: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          ad_source_id: string
          ad_title: string
          lead_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      recalc_customer_recurrence: {
        Args: { p_contact: string; p_workspace: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "master"
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
      app_role: ["admin", "user", "master"],
    },
  },
} as const
