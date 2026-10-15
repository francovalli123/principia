import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth';
import { AuthApiService } from './auth-api';

//Intercepts HTTP requests to append the access token for authenticated requests

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const authApi = inject(AuthApiService);

    // Public auth endpoints must not trigger token renewal. In particular, a
    // stale refresh token in localStorage must not turn a signup 401 into a
    // refresh request (or cause refresh to intercept itself).
    const url = new URL(req.url, globalThis.location?.origin ?? 'http://localhost');
    const isPublicAuthRequest = /\/api\/(signup|login|token\/refresh)\/?$/.test(url.pathname);

    if (isPublicAuthRequest) {
        return next(req);
    }

    const access = authService.getAccessToken();

    if (access) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${access}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401) {
                return throwError(() => error);
            }

            const refresh = authService.getRefreshToken();

            if (!refresh) {
                authService.clearTokens();
                return throwError(() => error);
            }

            return authApi.refreshToken(refresh).pipe(
                switchMap((response) => {
                    authService.setAccessToken(response.access);

                    const retryRequest = req.clone({
                        setHeaders: {
                            Authorization: `Bearer ${response.access}`
                        }
                    });

                    return next(retryRequest);
                }),

                catchError((refreshError) => {
                    authService.clearTokens();
                    return throwError(() => refreshError);
                })
            );
        })
    );
};
