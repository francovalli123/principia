import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserApiService {
    private baseUrl = 'http://127.0.0.1:8000/api/users';

    constructor(private http: HttpClient) {}

    getCurrentUser(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/`);
    }

    getUser(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/${id}/`);
    }

    updateUser(id: number, data: any): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/${id}/`, data);
    }

    deleteUser(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}/`);
    }
}