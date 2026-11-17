import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiService } from '../../services/auth-api';
import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  const authApi = { signup: vi.fn() };
  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [{ provide: AuthApiService, useValue: authApi }, provideRouter([])],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  it('disables the submit button while the form is invalid', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    component.form.setValue({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'Physics2026!',
    });
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });

  it('creates an account and then offers login', () => {
    authApi.signup.mockReturnValue(of({ username: 'carla', email: 'carla@example.com' }));
    const fixture = TestBed.createComponent(RegisterPage);
    const component = fixture.componentInstance;
    component.form.setValue({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'Physics2026!',
    });

    component.submit();

    expect(authApi.signup).toHaveBeenCalledWith(
      'Carla', 'Pérez', 'carla', 'carla@example.com', 'Physics2026!',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
    });
  });

  it('does not send a registration if passwords do not match', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    const component = fixture.componentInstance;
    component.form.setValue({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'different',
    });

    component.submit();

    expect(component.errorMessage).toBe('Las contraseñas no coinciden.');
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  it('shows a password length error below 8 characters, but not at 8', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    const password = fixture.componentInstance.form.controls.password;

    password.setValue('1234567');
    password.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#password-error')?.textContent).toContain(
      'La contraseña debe tener al menos 8 caracteres.',
    );
    expect(fixture.nativeElement.querySelector('#password')?.getAttribute('aria-invalid')).toBe(
      'true',
    );

    password.setValue('12345678');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#password-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('#password')?.getAttribute('aria-invalid')).toBe(
      'false',
    );
  });

  it('shows the validation message from the API response envelope', () => {
    authApi.signup.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              status: 'error',
              message: {
                password: ['This password is too common.'],
              },
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(RegisterPage);
    const component = fixture.componentInstance;
    component.form.setValue({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'Physics2026!',
    });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('This password is too common.');
    expect(component.form.getRawValue()).toEqual({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'Physics2026!',
    });
    expect(component.submitting).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'This password is too common.',
    );
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain(
      'Crear cuenta gratis',
    );
  });
});
