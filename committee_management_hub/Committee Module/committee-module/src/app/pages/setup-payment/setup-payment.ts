import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentMethodService, PaymentMethod, MethodType } from '../../core/payment-method.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-setup-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup-payment.html',
  styleUrl: './setup-payment.scss'
})
export class SetupPaymentComponent implements OnInit {
  methods      = signal<PaymentMethod[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  deleting     = signal<string | null>(null);
  errorMsg     = signal('');
  successMsg   = signal('');
  showForm     = signal(false);
  editingId    = signal<string | null>(null);

  form: FormGroup;
  submitted = false;

  readonly methodTypes: { value: MethodType; label: string; icon: string; color: string }[] = [
    { value: 'jazzcash',  label: 'JazzCash',  icon: 'phone_iphone',    color: '#c2410c' },
    { value: 'easypaisa', label: 'Easypaisa', icon: 'phone_android',   color: '#15803d' },
    { value: 'bank',      label: 'Bank',      icon: 'account_balance', color: '#1d4ed8' },
  ];

  constructor(
    private fb: FormBuilder,
    private paymentMethodService: PaymentMethodService,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      method_type:    ['jazzcash', Validators.required],
      account_title:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      account_number: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(30)]],
      bank_name:      [''],
      iban:           ['', [Validators.pattern(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/)]],
      is_primary:     [false],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.loadMethods();
  }

  async loadMethods(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.paymentMethodService.getMyMethods();
    this.loading.set(false);
    this.methods.set(data);
    // Auto-open form if no methods yet
    if (data.length === 0) this.showForm.set(true);
  }

  get f() { return this.form.controls; }
  get selectedType(): MethodType { return this.form.get('method_type')?.value; }
  get isBank(): boolean { return this.selectedType === 'bank'; }

  fieldError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched || this.submitted));
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.form.reset({ method_type: 'jazzcash', is_primary: this.methods().length === 0 });
    this.submitted = false;
    this.errorMsg.set('');
    this.showForm.set(true);
  }

  openEditForm(method: PaymentMethod): void {
    this.editingId.set(method.id);
    this.form.patchValue({
      method_type:    method.method_type,
      account_title:  method.account_title,
      account_number: method.account_number,
      bank_name:      method.bank_name || '',
      iban:           method.iban || '',
      is_primary:     method.is_primary,
    });
    this.submitted = false;
    this.errorMsg.set('');
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset({ method_type: 'jazzcash', is_primary: false });
    this.submitted = false;
    this.errorMsg.set('');
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) return;

    // Check for duplicate: same account number AND same method type
    const existing = this.methods().find(m =>
      m.account_number === this.form.value.account_number &&
      m.method_type    === this.form.value.method_type &&
      m.id !== this.editingId()
    );
    if (existing) {
      this.errorMsg.set(`This ${this.form.value.method_type} account number is already added.`);
      return;
    }

    this.saving.set(true);
    this.errorMsg.set('');

    const formValue = this.form.value;
    let result: { error: string | null };

    if (this.editingId()) {
      result = await this.paymentMethodService.updateMethod(this.editingId()!, formValue);
    } else {
      result = await this.paymentMethodService.addMethod(formValue);
    }

    this.saving.set(false);

    if (result.error) { this.errorMsg.set(result.error); return; }

    this.successMsg.set(this.editingId() ? 'Payment method updated!' : 'Payment method added!');
    setTimeout(() => this.successMsg.set(''), 3000);
    this.cancelForm();
    await this.loadMethods();
  }

  async deleteMethod(id: string): Promise<void> {
    this.deleting.set(id);
    await this.paymentMethodService.deleteMethod(id);
    this.deleting.set(null);
    await this.loadMethods();
  }

  async setPrimary(id: string): Promise<void> {
    await this.paymentMethodService.setPrimary(id);
    await this.loadMethods();
  }

  async finishSetup(): Promise<void> {
    if (this.methods().length === 0) {
      this.errorMsg.set('Please add at least one payment method to continue.');
      return;
    }
    await this.paymentMethodService.markSetupComplete();
    this.router.navigate(['/dashboard']);
  }

  getMethodInfo(type: MethodType) {
    return this.paymentMethodService.getMethodInfo(type);
  }

  getPhoneHint(type: MethodType): string {
    if (type === 'jazzcash')  return 'e.g. 03001234567';
    if (type === 'easypaisa') return 'e.g. 03001234567';
    return 'Account / IBAN number';
  }
}
