import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileApiService {
    constructor(private api: BaseApiService) {}

    getProfile(): Observable<any> {
        return this.api.get<any>('users/profile/');
    }

    updateProfile(data: any): Observable<any> {
        return this.api.patch<any>('users/profile/', data);
    }

    replaceProfile(data: any): Observable<any> {
        return this.api.put<any>('users/profile/', data);
    }

    getSimulationsByPhenomenon(phenomenonType: string): Observable<any> {
        return this.api.get<any>(
            `users/profile/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}