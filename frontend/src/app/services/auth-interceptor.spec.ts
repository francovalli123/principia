import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth';
import { authInterceptor } from './auth-interceptor';
import { errorInterceptor } from './error-interceptor';

describe('auth interceptor refresh flow', () => {
  let httpTesting: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setTokens('expired-access', 'valid-refresh');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('refreshes an expired access token, retries once, and stores the rotated refresh token', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let response: unknown;
    let requestError: unknown;

    TestBed.inject(HttpClient)
      .get('http://127.0.0.1:8000/api/forums/5/')
      .subscribe({
        next: (value) => response = value,
        error: (error: unknown) => requestError = error,
      });

    const initialRequest = httpTesting.expectOne('http://127.0.0.1:8000/api/forums/5/');
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-access');
    initialRequest.flush({ detail: 'Given token not valid for any token type' }, {
      status: 401,
      statusText: 'Unauthorized',
    });

    const refreshRequest = httpTesting.expectOne('http://127.0.0.1:8000/api/token/refresh/');
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refresh: 'valid-refresh' });
    refreshRequest.flush({ access: 'new-access', refresh: 'rotated-refresh' });

    const retryRequest = httpTesting.expectOne('http://127.0.0.1:8000/api/forums/5/');
    expect(retryRequest.request.headers.get('Authorization')).toBe('Bearer new-access');
    retryRequest.flush({ id: 5, name: 'Physics' });

    expect(response).toEqual({ id: 5, name: 'Physics' });
    expect(requestError).toBeUndefined();
    expect(auth.getAccessToken()).toBe('new-access');
    expect(auth.getRefreshToken()).toBe('rotated-refresh');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('passes login 401 responses to the login form without logging them as unexpected errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let requestError: unknown;

    TestBed.inject(HttpClient)
      .post('http://127.0.0.1:8000/api/login/', { username: 'carla', password: 'wrong' })
      .subscribe({
        error: (error: unknown) => requestError = error,
      });

    httpTesting.expectOne('http://127.0.0.1:8000/api/login/').flush(
      { message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(requestError).toMatchObject({
      status: 401,
      error: { message: 'Credenciales inválidas' },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});
