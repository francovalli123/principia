import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProfileApiService {
    private baseUrl = 'http://127.0.0.1:8000/api/users/profile';

    constructor(private http: HttpClient) {}

    getProfile(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/`);
    }

    updateProfile(data: any): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/`, data);
    }

    replaceProfile(data: any): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/`, data);
    }

    getSimulationsByPhenomenon(phenomenonType: string): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}