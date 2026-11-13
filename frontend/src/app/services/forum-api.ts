import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Author } from '../../models/user';
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

export interface ForumResponse {
    status: string;
    data: Forum;
}

interface ForumSearchResponse {
    status: string;
    data: Forum[];
}

export interface SuggestedForumsResponse {
    status: string;
    data: {
        results: Forum[];
        total_other_forums: number;
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

    searchForums(query: string): Observable<Forum[]> {
        return this.api.get<ForumSearchResponse>(`forums/?search=${encodeURIComponent(query)}`).pipe(
            map((response) => response.data)
        );
    }

    getMyForums(): Observable<Forum[]> {
        return this.api.get<PaginatedResponse<Forum>>('forums/mine/').pipe(
            map((response) => response.data.results)
        );
    }
    getSuggestedForums(): Observable<SuggestedForumsResponse> {
        return this.api.get<SuggestedForumsResponse>('forums/suggested/');
    }
    getForum(id: number): Observable<Forum> {
        return this.api.get<ForumResponse>(`forums/${id}/`).pipe(
            map((response) => response.data)
        );
    }

    createForum(data: Pick<Forum, 'name' | 'description'>): Observable<ForumResponse> {
        return this.api.post<ForumResponse>('forums/', data);
    }

    updateForum(
        id: number,
        data: Pick<Forum, 'name' | 'description'>
    ): Observable<ForumResponse> {
        return this.api.patch<ForumResponse>(`forums/${id}/`, data);
    }

    deleteForum(id: number): Observable<void> {
        return this.api.delete<void>(`forums/${id}/`);
    }

    joinForum(id: number): Observable<any> {
        return this.api.post<any>(`forums/${id}/join/`, {});
    }

    leaveForum(id: number): Observable<any> {
        return this.api.delete<any>(`forums/${id}/leave/`);
    }

    getMembers(id: number): Observable<Author[]> {
        return this.api.get<PaginatedResponse<Author>>(`forums/${id}/members/`).pipe(
            map((response) => response.data.results)
        );
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
