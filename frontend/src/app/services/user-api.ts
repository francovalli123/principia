import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class UserApiService {
    constructor(private api: BaseApiService) {}

    getCurrentUser(): Observable<any> {
        return this.api.get<any>('users/');
    }

    getUser(id: number): Observable<any> {
        return this.api.get<any>(`users/${id}/`);
    }

    updateUser(id: number, data: any): Observable<any> {
        return this.api.patch<any>(`users/${id}/`, data);
    }

    deleteUser(id: number): Observable<any> {
        return this.api.delete<any>(`users/${id}/`);
    }
}