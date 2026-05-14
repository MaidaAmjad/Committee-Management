import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { COUNTRY_DIAL_CODES } from '../../data/country-dial-codes';
import { buildE164, isPlausibleE164 } from '../../core/phone.utils';

@Component({
  selector: 'app-phone-required-gate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#c3c6d7] overflow-hidden">
          <div class="bg-gradient-to-r from-[#004ac6] to-[#2563eb] px-6 py-5">
            <h2 class="text-lg font-bold text-white">Add your phone number</h2>
            <p class="text-white/85 text-sm mt-1">A valid mobile number is required to continue using TrustCom.</p>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#434655] uppercase tracking-wide mb-1.5">Country</label>
              <select [(ngModel)]="countryIso2" name="gateCountry" class="w-full rounded-xl border border-[#c3c6d7] px-3 py-2.5 text-sm text-[#191c1e] bg-white focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 outline-none max-h-40">
                @for (c of countries; track c.iso2) {
                  <option [value]="c.iso2">{{ c.name }} (+{{ c.dial }})</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#434655] uppercase tracking-wide mb-1.5">Mobile number</label>
              <div class="flex rounded-xl border border-[#c3c6d7] overflow-hidden focus-within:border-[#004ac6] focus-within:ring-2 focus-within:ring-[#004ac6]/15">
                <span class="flex items-center px-3 text-sm font-semibold text-[#191c1e] bg-[#f2f4f6] border-r border-[#e2e8f0]">+{{ selectedDial() }}</span>
                <input type="tel" [(ngModel)]="nationalDigits" (ngModelChange)="onNationalChange()" name="gateNational"
                  class="flex-1 min-w-0 border-0 px-3 py-2.5 text-sm outline-none" placeholder="Enter number without country code"
                  inputmode="numeric" autocomplete="tel-national" maxlength="15" />
              </div>
              @if (nationalDigits.length > 0 && !phoneValid()) {
                <p class="text-xs text-[#ba1a1a] mt-1.5">Enter enough digits for a valid international number (8–15 digits total with country code).</p>
              }
            </div>
            @if (errorMsg()) {
              <p class="text-sm text-[#ba1a1a]">{{ errorMsg() }}</p>
            }
            <button type="button" (click)="save()" [disabled]="saving() || !phoneValid()"
              class="w-full py-3 rounded-xl bg-[#004ac6] text-white text-sm font-semibold hover:bg-[#2563eb] disabled:opacity-45 disabled:cursor-not-allowed transition-colors">
              {{ saving() ? 'Saving…' : 'Save and continue' }}
            </button>
            <button type="button" (click)="signOut()" [disabled]="saving()"
              class="w-full py-2.5 text-sm text-[#737686] hover:text-[#191c1e] transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PhoneRequiredGateComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);

  countries = COUNTRY_DIAL_CODES;
  countryIso2 = 'PK';
  nationalDigits = '';
  visible = signal(false);
  saving = signal(false);
  errorMsg = signal('');

  private routerSub?: Subscription;
  private authUnsub?: { unsubscribe: () => void };

  selectedDial(): string {
    const c = this.countries.find(x => x.iso2 === this.countryIso2);
    return c?.dial ?? '92';
  }

  phoneE164(): string {
    return buildE164(this.selectedDial(), this.nationalDigits);
  }

  phoneValid(): boolean {
    return isPlausibleE164(this.phoneE164());
  }

  onNationalChange(): void {
    this.nationalDigits = this.nationalDigits.replace(/\D/g, '').slice(0, 15);
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.refresh();

    const { data } = this.supabase.auth.onAuthStateChange(() => {
      void this.refresh();
    });
    this.authUnsub = data.subscription;

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => void this.refresh());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.authUnsub?.unsubscribe();
  }

  private async refresh(): Promise<void> {
    await this.auth.ready;
    if (!this.auth.isLoggedIn) {
      this.visible.set(false);
      return;
    }
    const ok = await this.profileService.currentUserHasValidPhone();
    this.visible.set(!ok);
  }

  async save(): Promise<void> {
    if (!this.phoneValid()) return;
    const phone = this.phoneE164();
    this.saving.set(true);
    this.errorMsg.set('');

    const { error: ue } = await this.supabase.auth.updateUser({
      data: { phone },
    });

    if (ue) {
      this.saving.set(false);
      this.errorMsg.set(ue.message);
      return;
    }

    const uid = this.auth.user()?.id;
    if (uid) {
      const { error: pe } = await this.supabase.from('profiles').update({ phone }).eq('id', uid);
      if (pe) console.warn('profiles phone update:', pe.message);
    }

    await this.profileService.syncMetadataToProfile();
    this.saving.set(false);
    this.visible.set(false);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.visible.set(false);
  }
}
