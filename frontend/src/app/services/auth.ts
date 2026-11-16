import { Injectable } from '@angular/core';
//Administers authentication tokens and user session state
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly storage = getStorage('sessionStorage');

    constructor() {
        if (typeof window === 'undefined') return;

        getStorage('localStorage')?.removeItem('access_token');
        getStorage('localStorage')?.removeItem('refresh_token');
        if (window.opener) this.clearTokens();
    }

    setTokens(access: string, refresh: string): void {
        this.storage?.setItem('access_token', access);
        this.storage?.setItem('refresh_token', refresh);
    }
    setAccessToken(access: string): void {
        this.storage?.setItem('access_token', access);
    }

    setRefreshToken(refresh: string): void {
        this.storage?.setItem('refresh_token', refresh);
    }
    getAccessToken(): string | null {
        return this.storage?.getItem('access_token') ?? null;
    }

    getRefreshToken(): string | null {
        return this.storage?.getItem('refresh_token') ?? null;
    }

    clearTokens(): void {
        this.storage?.removeItem('access_token');
        this.storage?.removeItem('refresh_token');
    }

    isLoggedIn(): boolean {
        return this.getAccessToken() !== null;
    }
}

function getStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return window[name] ?? null;
    } catch {
        return null;
    }
}