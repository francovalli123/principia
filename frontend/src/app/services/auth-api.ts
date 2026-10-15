import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { User } from '../../models/user';
//Communicates with the backend API for authentication-related operations

export interface LoginResponse {
  access: string;
  refresh: string;
}

export type SignupResponse = Pick<User, 'username' | 'email'>;

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  constructor(
    private http: HttpClient,
    private api: BaseApiService,
  ) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.api.getUrl('login/'), {
      username,
      password,
    });
  }

  signup(
    first_name: string,
    last_name: string,
    username: string,
    email: string,
    password: string,
  ): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(this.api.getUrl('signup/'), {
      first_name,
      last_name,
      username,
      email,
      password,
    });
  }

  refreshToken(refresh: string): Observable<any> {
    return this.http.post<any>(this.api.getUrl('token/refresh/'), {
      refresh,
    });
  }

  logout(refresh: string, access: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${access}`,
    });

    return this.http.post<any>(this.api.getUrl('users/logout/'), { refresh }, { headers });
  }

  logoutAll(access: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${access}`,
    });

    return this.http.post<any>(this.api.getUrl('users/logout-all/'), {}, { headers });
  }
}
