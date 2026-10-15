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

  it('creates an account and then offers login', () => {
    authApi.signup.mockReturnValue(of({ username: 'carla', email: 'carla@example.com' }));
    const component = TestBed.createComponent(RegisterPage).componentInstance;
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
    const component = TestBed.createComponent(RegisterPage).componentInstance;
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
    const component = TestBed.createComponent(RegisterPage).componentInstance;
    component.form.setValue({
      first_name: 'Carla',
      last_name: 'Pérez',
      username: 'carla',
      email: 'carla@example.com',
      password: 'Physics2026!',
      passwordConfirmation: 'Physics2026!',
    });

    component.submit();

    expect(component.errorMessage).toBe('This password is too common.');
  });
});
