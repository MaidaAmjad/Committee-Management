import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ReviewService } from './review.service';

export interface VerificationRequest {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  cnic_number: string;
  cnic_front_url: string;
  selfie_url: string;
  bank_account_title?: string;
  additional_notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  // Joined from profiles
  email?: string;
  trust_score?: number;
}

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    private reviewService: ReviewService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Get current user's verification status */
  async getMyVerification(): Promise<{ data: VerificationRequest | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VerificationRequest | null, error: null };
  }

  /** Get verification status for any user (for badge display) */
  async getUserVerificationStatus(userId: string): Promise<'none' | 'pending' | 'approved' | 'rejected'> {
    const { data } = await this.supabase
      .from('user_verifications')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    return (data?.status as any) ?? 'none';
  }

  /** Upload a verification document to Supabase Storage */
  async uploadDocument(
    file: File,
    docType: 'cnic_front' | 'selfie'
  ): Promise<{ url: string | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { url: null, error: 'Not authenticated' };

    const ext = file.name.split('.').pop();
    const path = `verifications/${user.id}/${docType}_${Date.now()}.${ext}`;

    // Try verification-documents bucket first, fall back to payment-proofs
    const buckets = ['verification-documents', 'payment-proofs'];
    
    for (const bucket of buckets) {
      const { error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        return { url: urlData.publicUrl, error: null };
      }

      // If bucket not found, try next bucket
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        console.warn(`Bucket "${bucket}" not found, trying next...`);
        continue;
      }

      // Other error — return it
      return { url: null, error: uploadError.message };
    }

    return { 
      url: null, 
      error: 'Storage bucket not found. Please create a "verification-documents" bucket in Supabase Storage (Dashboard → Storage → New Bucket → Name: verification-documents → Public: ON).' 
    };
  }

  /** Submit verification request */
  async submitVerification(payload: {
    full_name: string;
    phone_number: string;
    cnic_number: string;
    cnic_front_url: string;
    selfie_url: string;
    bank_account_title?: string;
    additional_notes?: string;
  }): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('user_verifications')
      .upsert({
        user_id: user.id,
        ...payload,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return { error: error.message };

    // Update profile verification_status
    await this.supabase
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', user.id);

    return { error: null };
  }

  // ── Admin methods ─────────────────────────────────────────────────────

  /** Get all verification requests (admin only) */
  async getAllVerifications(): Promise<{ data: VerificationRequest[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('user_verifications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as VerificationRequest[], error: null };
  }

  /** Approve a verification request */
  async approveVerification(verificationId: string, userId: string): Promise<{ error: string | null }> {
    const admin = this.auth.user();
    if (!admin) return { error: 'Not authenticated' };

    const { error: updateError } = await this.supabase
      .from('user_verifications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        rejection_reason: null,
      })
      .eq('id', verificationId);

    if (updateError) return { error: updateError.message };

    // Update profile: is_verified = true
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({ is_verified: true, verification_status: 'approved' })
      .eq('id', userId);

    if (profileError) console.error('Failed to update profile:', profileError);
    await this.reviewService.recalculateTrustScore(userId);

    return { error: null };
  }

  /** Reject a verification request */
  async rejectVerification(
    verificationId: string,
    userId: string,
    reason: string
  ): Promise<{ error: string | null }> {
    const admin = this.auth.user();
    if (!admin) return { error: 'Not authenticated' };

    const { error: updateError } = await this.supabase
      .from('user_verifications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        rejection_reason: reason,
      })
      .eq('id', verificationId);

    if (updateError) return { error: updateError.message };

    // Update profile
    await this.supabase
      .from('profiles')
      .update({ is_verified: false, verification_status: 'rejected' })
      .eq('id', userId);
    await this.reviewService.recalculateTrustScore(userId);

    return { error: null };
  }
}
