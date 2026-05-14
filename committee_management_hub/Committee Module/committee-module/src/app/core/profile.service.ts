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

  /** Copy phone / name from auth user_metadata into public.profiles (WhatsApp uses profiles.phone). */
  async syncMetadataToProfile(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user?.id) return;

    const phone =
      typeof user.user_metadata?.['phone'] === 'string' ? user.user_metadata['phone'].trim() : '';
    const full_name =
      typeof user.user_metadata?.['full_name'] === 'string' ? user.user_metadata['full_name'].trim() : '';

    const updates: Record<string, string> = {};
    if (phone) updates['phone'] = phone;
    if (full_name) updates['full_name'] = full_name;
    if (Object.keys(updates).length === 0) return;

    const { error } = await this.supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) console.warn('syncMetadataToProfile:', error.message);
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
    const { data: created, error } = await this.supabase
      .from('committees')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('user_id', userId)
      .eq('status', 'approved');

    const memberCommitteeIds = (memberships ?? [])
      .map((m: any) => m.committee_id)
      .filter((id: string) => !(created ?? []).some((c: any) => c.id === id));

    let joined: any[] = [];
    if (memberCommitteeIds.length > 0) {
      const { data } = await this.supabase
        .from('committees')
        .select('*')
        .in('id', memberCommitteeIds);
      joined = data ?? [];
    }

    return {
      data: [
        ...(created ?? []).map((c: any) => ({ ...c, member_role: 'Admin' })),
        ...joined.map((c: any) => ({ ...c, member_role: 'Member' })),
      ],
      error: null
    };
  }
}
