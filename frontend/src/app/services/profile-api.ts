import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Profile } from '../../models/user';
@Injectable({
    providedIn: 'root'
})
export class ProfileApiService {
    constructor(private api: BaseApiService) {}

    getProfile(): Observable<Profile> {
        return this.api.get<Profile>('users/profile/');
    }

    updateProfile(data: any): Observable<Profile> {
        return this.api.patch<Profile>('users/profile/', data);
    }

    replaceProfile(data: any): Observable<Profile> {
        return this.api.put<Profile>('users/profile/', data);
    }

    getSimulationsByPhenomenon(phenomenonType: string): Observable<any> {
        return this.api.get<any>(
            `users/profile/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}