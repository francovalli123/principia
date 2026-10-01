import { Injectable } from '@angular/core';
//Administers authentication tokens and user session state
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    setTokens(access: string, refresh: string): void {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    }

    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refresh_token');
    }

    clearTokens(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    isLoggedIn(): boolean {
        return this.getAccessToken() !== null;
    }
}