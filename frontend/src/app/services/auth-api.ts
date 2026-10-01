import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
//Communicates with the backend API for authentication-related operations
@Injectable({
    providedIn: 'root'
})
export class AuthApiService {
    constructor(
        private http: HttpClient,
        private api: BaseApiService
    ) {}

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(this.api.getUrl('login/'), {
            username,
            password
        });
    }

    signup(username: string, email: string, password: string): Observable<any> {
        return this.http.post<any>(this.api.getUrl('signup/'), {
            username,
            email,
            password
        });
    }

    refreshToken(refresh: string): Observable<any> {
        return this.http.post<any>(this.api.getUrl('token/refresh/'), {
            refresh
        });
    }

    logout(refresh: string, access: string): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${access}`
        });

        return this.http.post<any>(
            this.api.getUrl('users/logout/'),
            { refresh },
            { headers }
        );
    }

    logoutAll(access: string): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${access}`
        });

        return this.http.post<any>(
            this.api.getUrl('users/logout-all/'),
            {},
            { headers }
        );
    }
}