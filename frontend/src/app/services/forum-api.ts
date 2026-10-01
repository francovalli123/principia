import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class ForumApiService {
    constructor(private api: BaseApiService) {}

    getForums(): Observable<any> {
        return this.api.get<any>('forums/');
    }

    getForum(id: number): Observable<any> {
        return this.api.get<any>(`forums/${id}/`);
    }

    createForum(data: any): Observable<any> {
        return this.api.post<any>('forums/', data);
    }

    deleteForum(id: number): Observable<any> {
        return this.api.delete<any>(`forums/${id}/`);
    }

    joinForum(id: number): Observable<any> {
        return this.api.post<any>(`forums/${id}/join/`, {});
    }

    leaveForum(id: number): Observable<any> {
        return this.api.delete<any>(`forums/${id}/leave/`);
    }

    getMembers(id: number): Observable<any> {
        return this.api.get<any>(`forums/${id}/members/`);
    }

    kickMember(id: number, userId: number): Observable<any> {
        return this.api.delete<any>(`forums/${id}/members/${userId}/`);
    }

    getPublicationsByTitle(id: number, title: string): Observable<any> {
        return this.api.get<any>(
            `forums/${id}/?publication_title=${encodeURIComponent(title)}`
        );
    }

    getPublicationsByPhenomenon(id: number, phenomenonType: string): Observable<any> {
        return this.api.get<any>(
            `forums/${id}/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}