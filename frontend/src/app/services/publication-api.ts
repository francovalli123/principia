import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PublicationApiService {
    private baseUrl = 'http://127.0.0.1:8000/api/publications';

    constructor(private http: HttpClient) {}

    getPublication(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/${id}/`);
    }

    getByForum(forumId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/?forum_id=${forumId}`
        );
    }

    createPublication(
        title: string,
        description: string,
        simulationId: number,
        forumId?: number
    ): Observable<any> {
        const body: any = {
            title: title,
            description: description,
            simulation: simulationId
        };

        if (forumId !== undefined) {
            body.forum = forumId;
        }

        return this.http.post<any>(
            `${this.baseUrl}/`,
            body
        );
    }

    deletePublication(id: number): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/${id}/`
        );
    }
}