import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../services/auth-api';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    passwordConfirmation: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submitting = false;
  errorMessage = '';

  constructor(
    private readonly authApi: AuthApiService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, password, passwordConfirmation } = this.form.getRawValue();
    if (password !== passwordConfirmation) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.errorMessage = '';
    this.submitting = true;
    this.authApi
      .signup(username, email, password)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], {
            queryParams: { registered: '1' },
          });
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      typeof error.error === 'object' &&
      error.error !== null
    ) {
      const message = this.findErrorMessage(error.error);
      if (message) {
        return message;
      }
    }

    return 'No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo.';
  }

  private findErrorMessage(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.findErrorMessage(item)).find(Boolean);
    }

    if (typeof value !== 'object' || value === null) {
      return undefined;
    }

    const errorDetails = value as Record<string, unknown>;
    const preferredMessage = this.findErrorMessage(errorDetails['message'] ?? errorDetails['detail']);
    if (preferredMessage) {
      return preferredMessage;
    }

    return Object.entries(errorDetails)
      .filter(([key]) => key !== 'status')
      .map(([, detail]) => this.findErrorMessage(detail))
      .find(Boolean);
  }
}
