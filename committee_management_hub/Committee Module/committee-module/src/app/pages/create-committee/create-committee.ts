import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService } from '../../core/committee.service';

@Component({
  selector: 'app-create-committee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './create-committee.html',
  styleUrl: './create-committee.scss'
})
export class CreateCommitteeComponent {
  form: FormGroup;
  submitted = false;
  loading   = false;
  success   = false;
  errorMsg  = '';

  // Min date for deadline picker = today
  minDate = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private committeeService: CommitteeService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name:                 ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      monthlyAmount:        [null, [Validators.required, Validators.min(1)]],
      maxMembers:           [null, [Validators.required, Validators.min(2), Validators.max(100)]],
      description:          ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      durationMonths:       [12], // default 12 months, hidden from user
      paymentDeadlineDate:  ['', Validators.required],
      gracePeriodDays:      [3, [Validators.required, Validators.min(0), Validators.max(30)]],
      paymentCycleDays:     [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      distributionMethod:   ['random', Validators.required],
    });
  }

  get f() { return this.form.controls; }

  fieldError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted));
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required'])   return 'This field is required.';
    if (ctrl.errors['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['maxlength'])  return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters.`;
    if (ctrl.errors['min'])        return `Minimum value is ${ctrl.errors['min'].min}.`;
    if (ctrl.errors['max'])        return `Maximum value is ${ctrl.errors['max'].max}.`;
    return 'Invalid value.';
  }

  /** Compute end date from deadline + duration */
  get endDate(): string {
    const deadline = this.f['paymentDeadlineDate'].value;
    const months   = this.f['durationMonths'].value;
    if (!deadline || !months) return '';
    const d = new Date(deadline);
    d.setMonth(d.getMonth() + Number(months));
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) return;

    this.loading  = true;
    this.errorMsg = '';

    const { error } = await this.committeeService.createCommittee(this.form.value);

    this.loading = false;

    if (error) { this.errorMsg = error; return; }

    this.success = true;
    setTimeout(() => this.router.navigate(['/my-committees']), 1800);
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
