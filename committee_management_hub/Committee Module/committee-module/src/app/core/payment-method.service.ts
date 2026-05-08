import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type MethodType = 'jazzcash' | 'easypaisa' | 'bank';

export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: MethodType;
  account_title: string;
  account_number: string;
  bank_name: string | null;
  iban: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodForm {
  method_type: MethodType;
  account_title: string;
  account_number: string;
  bank_name?: string;
  iban?: string;
  is_primary: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Get all payment methods for the current user */
  async getMyMethods(): Promise<{ data: PaymentMethod[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: data as PaymentMethod[], error: null };
  }

  /** Get payment methods for a specific user (visible to committee members) */
  async getUserMethods(userId: string): Promise<{ data: PaymentMethod[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as PaymentMethod[], error: null };
  }

  /** Add a new payment method */
  async addMethod(form: PaymentMethodForm): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    // If setting as primary, unset all others first
    if (form.is_primary) {
      await this.supabase
        .from('payment_methods')
        .update({ is_primary: false })
        .eq('user_id', user.id);
    }

    const { error } = await this.supabase.from('payment_methods').insert({
      user_id:        user.id,
      method_type:    form.method_type,
      account_title:  form.account_title,
      account_number: form.account_number,
      bank_name:      form.bank_name || null,
      iban:           form.iban || null,
      is_primary:     form.is_primary,
    });

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Update an existing payment method */
  async updateMethod(id: string, form: PaymentMethodForm): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    if (form.is_primary) {
      await this.supabase
        .from('payment_methods')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', id);
    }

    const { error } = await this.supabase
      .from('payment_methods')
      .update({
        method_type:    form.method_type,
        account_title:  form.account_title,
        account_number: form.account_number,
        bank_name:      form.bank_name || null,
        iban:           form.iban || null,
        is_primary:     form.is_primary,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Delete a payment method */
  async deleteMethod(id: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Set a method as primary */
  async setPrimary(id: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    // Unset all
    await this.supabase
      .from('payment_methods')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    // Set this one
    const { error } = await this.supabase
      .from('payment_methods')
      .update({ is_primary: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Mark payment setup as complete in profiles */
  async markSetupComplete(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    await this.supabase
      .from('profiles')
      .update({ payment_setup_complete: true })
      .eq('id', user.id);
  }

  /** Check if user has completed payment setup */
  async isSetupComplete(): Promise<boolean> {
    const user = this.auth.user();
    if (!user) return false;

    const { data } = await this.supabase
      .from('profiles')
      .select('payment_setup_complete')
      .eq('id', user.id)
      .maybeSingle();

    return data?.payment_setup_complete === true;
  }

  /** Get method type display info */
  getMethodInfo(type: MethodType): { label: string; color: string; bg: string; icon: string } {
    switch (type) {
      case 'jazzcash':  return { label: 'JazzCash',  color: '#c2410c', bg: '#fff7ed', icon: 'phone_iphone' };
      case 'easypaisa': return { label: 'Easypaisa', color: '#15803d', bg: '#f0fdf4', icon: 'phone_android' };
      case 'bank':      return { label: 'Bank',      color: '#1d4ed8', bg: '#eff6ff', icon: 'account_balance' };
    }
  }
}
