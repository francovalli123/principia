import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { User } from '../../models/user';

@Injectable({
    providedIn: 'root'
})
export class UserApiService {
    constructor(private api: BaseApiService) {}

    getCurrentUser(): Observable<User> {
        return this.api.get<User>('users/');
    }

    getUser(id: number): Observable<User> {
        return this.api.get<User>(`users/${id}/`);
    }

    updateUser(id: number, data: any): Observable<User> {
        return this.api.patch<User>(`users/${id}/`, data);
    }

    deleteUser(id: number): Observable<any> {
        return this.api.delete<any>(`users/${id}/`);
    }
}