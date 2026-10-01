import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class CommentApiService {
    constructor(private api: BaseApiService) {}

    getComments(publicationId: number): Observable<any> {
        return this.api.get<any>(`comments/?publication_id=${publicationId}`);
    }

    getComment(id: number): Observable<any> {
        return this.api.get<any>(`comments/${id}/`);
    }

    createComment(publicationId: number, content: string): Observable<any> {
        return this.api.post<any>('comments/', {
            publication: publicationId,
            content: content
        });
    }

    deleteComment(id: number): Observable<any> {
        return this.api.delete<any>(`comments/${id}/`);
    }
}