import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ForumApiService {
    private baseUrl = 'http://127.0.0.1:8000/api/forums';

    constructor(private http: HttpClient) {}

    getForums(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/`);
    }

    getForum(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/${id}/`);
    }

    createForum(data: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/`, data);
    }

    deleteForum(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}/`);
    }

    joinForum(id: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/${id}/join/`, {});
    }

    leaveForum(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}/leave/`);
    }

    getMembers(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/${id}/members/`);
    }

    kickMember(id: number, userId: number): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/${id}/members/${userId}/`
        );
    }

    getPublicationsByTitle(id: number, title: string): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/${id}/?publication_title=${encodeURIComponent(title)}`
        );
    }

    getPublicationsByPhenomenon(id: number, phenomenonType: string): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/${id}/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}