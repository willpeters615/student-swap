export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          username: string
          email: string
          password: string
          university: string | null
          verified: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          username: string
          email: string
          password: string
          university?: string | null
          verified?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          username?: string
          email?: string
          password?: string
          university?: string | null
          verified?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: number
          title: string
          description: string | null
          price: number
          condition: string | null
          category: string
          type: string
          images: string[] | null
          location: string | null
          created_at: string | null
          user_id: number | null
          status: string | null
          date: string | null
          duration: string | null
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          price: number
          condition?: string | null
          category: string
          type: string
          images?: string[] | null
          location?: string | null
          created_at?: string | null
          user_id?: number | null
          status?: string | null
          date?: string | null
          duration?: string | null
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          price?: number
          condition?: string | null
          category?: string
          type?: string
          images?: string[] | null
          location?: string | null
          created_at?: string | null
          user_id?: number | null
          status?: string | null
          date?: string | null
          duration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      favorites: {
        Row: {
          id: number
          created_at: string | null
          user_id: number | null
          listing_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string | null
          user_id?: number | null
          listing_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string | null
          user_id?: number | null
          listing_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: number
          created_at: string | null
          content: string
          listing_id: number | null
          sender_id: number | null
          receiver_id: number | null
          read: boolean | null
        }
        Insert: {
          id?: number
          created_at?: string | null
          content: string
          listing_id?: number | null
          sender_id?: number | null
          receiver_id?: number | null
          read?: boolean | null
        }
        Update: {
          id?: number
          created_at?: string | null
          content?: string
          listing_id?: number | null
          sender_id?: number | null
          receiver_id?: number | null
          read?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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