import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('allows navigation when an access token exists', () => {
    vi.spyOn(auth, 'isLoggedIn').mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('redirects unauthenticated users to login and preserves the requested URL', () => {
    vi.spyOn(auth, 'isLoggedIn').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/forums?sort=recent' } as RouterStateSnapshot,
      ),
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fforums%3Fsort%3Drecent');
  });
});
