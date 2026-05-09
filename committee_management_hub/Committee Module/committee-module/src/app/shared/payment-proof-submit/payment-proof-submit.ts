import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommitteeCycleService, PaymentProof } from '../../core/committee-cycle.service';

/**
 * Payment Proof Submit Component
 * Allows members to submit payment proof for current cycle
 */
@Component({
  selector: 'app-payment-proof-submit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-proof-submit.html',
  styleUrl: './payment-proof-submit.scss'
})
export class PaymentProofSubmitComponent {
  @Input() committeeId!: string;
  @Input() cycleNumber!: number;
  @Input() requiredAmount!: number;
  @Output() proofSubmitted = new EventEmitter<PaymentProof>();

  form: FormGroup;
  loading = signal(false);
  success = signal(false);
  error = signal('');
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Min date for payment date = today minus 30 days
  minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // Max date = today
  maxDate = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private cycleService: CommitteeCycleService
  ) {
    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      paymentDate: ['', Validators.required],
      proofImage: [null, Validators.required]
    });
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error.set('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('File size must be less than 5MB');
        return;
      }
      
      this.selectedFile = file;
      this.form.patchValue({ proofImage: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      this.error.set('');
    }
  }

  /**
   * Remove selected file
   */
  removeFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.patchValue({ proofImage: null });
  }

  /**
   * Submit payment proof
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.selectedFile) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    try {
      // In a real app, upload image to storage first
      // For now, we'll use a placeholder URL
      const imageUrl = `proof_${Date.now()}_${this.selectedFile.name}`;
      
      // TODO: Upload to Supabase Storage
      // const { data: uploadData, error: uploadError } = await this.supabase.storage
      //   .from('payment-proofs')
      //   .upload(imageUrl, this.selectedFile);
      
      const { data, error } = await this.cycleService.submitPaymentProof(
        this.committeeId,
        this.cycleNumber,
        imageUrl,
        this.form.value.amount,
        this.form.value.paymentDate
      );

      this.loading.set(false);

      if (error) {
        this.error.set(error);
        return;
      }

      if (data) {
        this.success.set(true);
        this.proofSubmitted.emit(data);
        
        // Reset form after 2 seconds
        setTimeout(() => {
          this.form.reset();
          this.removeFile();
          this.success.set(false);
        }, 2000);
      }
    } catch (err) {
      this.loading.set(false);
      this.error.set('Failed to submit payment proof');
    }
  }

  /**
   * Check if field has error
   */
  fieldError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  /**
   * Get field error message
   */
  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required';
    if (ctrl.errors['min']) return `Minimum value is ${ctrl.errors['min'].min}`;
    return 'Invalid value';
  }
}
