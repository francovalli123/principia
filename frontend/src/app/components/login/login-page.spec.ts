import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';
import { AuthApiService } from '../../services/auth-api';
import { AuthService } from '../../services/auth';

describe('LoginPage', () => {
  const authApi = {
    login: vi.fn(),
  };
  const auth = {
    setTokens: vi.fn(),
  };
  const router = {
    navigateByUrl: vi.fn(),
  };
  const route = {
    snapshot: {
      queryParamMap: {
        get: vi.fn(),
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    route.snapshot.queryParamMap.get.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('stores the returned tokens and navigates to the protected page', () => {
    authApi.login.mockReturnValue(of({ access: 'access-token', refresh: 'refresh-token' }));
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.form.setValue({ username: 'carla', password: 'secret' });

    component.submit();

    expect(authApi.login).toHaveBeenCalledWith('carla', 'secret');
    expect(auth.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
  });

  it('shows the API error message without storing tokens', () => {
    authApi.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { message: 'Credenciales invalidas' },
            status: 401,
          }),
      ),
    );
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.form.setValue({ username: 'carla', password: 'wrong' });

    component.submit();

    expect(component.errorMessage).toBe('Credenciales invalidas');
    expect(auth.setTokens).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('returns only to a local URL after authentication', () => {
    route.snapshot.queryParamMap.get.mockReturnValue('/forums');
    authApi.login.mockReturnValue(of({ access: 'access-token', refresh: 'refresh-token' }));
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.form.setValue({ username: 'carla', password: 'secret' });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/forums');
  });

  it('falls back to the home page for an external return URL', () => {
    route.snapshot.queryParamMap.get.mockReturnValue('https://example.com');
    authApi.login.mockReturnValue(of({ access: 'access-token', refresh: 'refresh-token' }));
    const component = TestBed.createComponent(LoginPage).componentInstance;
    component.form.setValue({ username: 'carla', password: 'secret' });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
  });
});
