import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../services/auth-api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submitting = false;
  errorMessage = '';

  get registrationComplete(): boolean {
    return this.route.snapshot.queryParamMap.get('registered') === '1';
  }

  constructor(
    private readonly authApi: AuthApiService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.submitting = true;
    const { username, password } = this.form.getRawValue();

    this.authApi
      .login(username, password)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (response) => {
          if (!response?.access || !response.refresh) {
            this.errorMessage = 'La respuesta de inicio de sesión no es válida.';
            return;
          }

          this.auth.setTokens(response.access, response.refresh);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(this.isLocalUrl(returnUrl) ? returnUrl : '/inicio');
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
              ? error.error.message
              : 'No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.';
        },
      });
  }

  private isLocalUrl(url: string | null): url is string {
    return url !== null && url.startsWith('/') && !url.startsWith('//');
  }
}
