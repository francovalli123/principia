import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Forum } from '../../models/forum';
import { BaseApiService } from './base-api.service';

interface PaginatedResponse<Forum> {
    status: string;
    data: {
        count: number;
        next: string | null;
        previous: string | null;
        results: Forum[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class ForumApiService {
    constructor(private api: BaseApiService) {}

    getForums(): Observable<Forum[]> {
        return this.api.get<PaginatedResponse<Forum>>('forums/').pipe(
            map((response) => response.data.results)
        );
    }
    getMyForums(): Observable<Forum[]> {
        return this.api.get<PaginatedResponse<Forum>>('forums/mine/').pipe(
            map((response) => response.data.results)
        );
    }
    getForum(id: number): Observable<Forum> {
        return this.api.get<Forum>(`forums/${id}/`);
    }

    createForum(data: any): Observable<Forum> {
        return this.api.post<Forum>('forums/', data);
    }

    deleteForum(id: number): Observable<Forum> {
        return this.api.delete<Forum>(`forums/${id}/`);
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