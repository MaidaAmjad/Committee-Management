import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  phone: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabase;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  async getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as UserProfile, error: null };
  }

  /** Fallback: build a minimal profile from committee_members data */
  async getProfileFromMembers(userId: string): Promise<UserProfile | null> {
    const { data } = await this.supabase
      .from('committee_members')
      .select('full_name, email, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: userId,
      full_name: data.full_name || 'Unknown User',
      email: data.email || '',
      bio: null,
      phone: null,
      created_at: data.joined_at,
    };
  }

  async getCommitteesByUser(userId: string): Promise<{ data: any[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committees')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data ?? [], error: null };
  }
}
