import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedGroup } from '../../core/shared-group.service';

@Component({
  selector: 'app-invite-member-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invite-member-modal.html',
  styleUrl: './invite-member-modal.scss',
})
export class InviteMemberModalComponent implements OnInit {
  /** The shared group for which the invitation is being sent. */
  @Input() group!: SharedGroup;

  /** Emitted when the leader submits a valid email. */
  @Output() submitted = new EventEmitter<{ groupId: string; inviteeEmail: string }>();

  /** Emitted when the modal is dismissed (cancel or backdrop click). */
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  submitted_flag = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get emailCtrl() { return this.form.get('email')!; }

  get emailError(): string {
    if (!this.emailCtrl.errors) return '';
    if (this.emailCtrl.errors['required']) return 'Email address is required.';
    if (this.emailCtrl.errors['email'])    return 'Please enter a valid email address.';
    return '';
  }

  onSubmit(): void {
    this.submitted_flag = true;
    if (this.form.invalid) return;

    this.submitted.emit({
      groupId:      this.group.id,
      inviteeEmail: this.emailCtrl.value.trim(),
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
