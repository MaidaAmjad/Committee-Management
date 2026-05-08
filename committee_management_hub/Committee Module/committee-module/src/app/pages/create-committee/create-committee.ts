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
  success = false;

  durationOptions = [3, 6, 9, 12, 18, 24, 36];

  constructor(
    private fb: FormBuilder,
    private committeeService: CommitteeService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      monthlyAmount: [null, [Validators.required, Validators.min(1)]],
      maxMembers: [null, [Validators.required, Validators.min(2), Validators.max(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      durationMonths: [null, Validators.required],
    });
  }

  // Convenience getter for cleaner template access
  get f() { return this.form.controls; }

  fieldError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted));
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'This field is required.';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters.`;
    if (ctrl.errors['min']) return `Minimum value is ${ctrl.errors['min'].min}.`;
    if (ctrl.errors['max']) return `Maximum value is ${ctrl.errors['max'].max}.`;
    return 'Invalid value.';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    this.committeeService.createCommittee(this.form.value);
    this.success = true;

    setTimeout(() => {
      this.router.navigate(['/my-committees']);
    }, 2000);
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
