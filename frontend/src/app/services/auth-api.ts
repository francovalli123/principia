import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
//Communicates with the backend API for authentication-related operations
@Injectable({
    providedIn: 'root'
})
export class AuthApiService {
    private baseUrl = 'http://127.0.0.1:8000/api';

    constructor(private http: HttpClient) {}

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/login/`, {
            username,
            password
        });
    }

    signup(username: string, email: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/signup/`, {
            username,
            email,
            password
        });
    }

    refreshToken(refresh: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/token/refresh`, {
            refresh
        });
    }

    logout(refresh: string, access: string): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${access}`
        });

        return this.http.post<any>(
            `${this.baseUrl}/users/logout/`,
            { refresh },
            { headers }
        );
    }

    logoutAll(access: string): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${access}`
        });

        return this.http.post<any>(
            `${this.baseUrl}/users/logout-all/`,
            {},
            { headers }
        );
    }
}