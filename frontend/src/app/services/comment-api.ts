import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CommentApiService {
    private baseUrl = 'http://127.0.0.1:8000/api/comments';

    constructor(private http: HttpClient) {}

    getComments(publicationId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/?publication_id=${publicationId}`
        );
    }

    getComment(id: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/${id}/`
        );
    }

    createComment(publicationId: number, content: string): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/`,
            {
                publication: publicationId,
                content: content
            }
        );
    }

    deleteComment(id: number): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/${id}/`
        );
    }
}