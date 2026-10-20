import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Comment } from '../../models/comment';

interface PaginatedResponse<Comment> {
    status: string;
    data: {
        count: number;
        next: string | null;
        previous: string | null;
        results: Comment[];
    };
}

@Injectable({
    providedIn: 'root'
})

export class CommentApiService {
    constructor(private api: BaseApiService) {}

    getComments(publicationId: number): Observable<PaginatedResponse<Comment>> {
        return this.api.get<PaginatedResponse<Comment>>(`comments/?publication_id=${publicationId}`);
    }

    getComment(id: number): Observable<Comment> {
        return this.api.get<Comment>(`comments/${id}/`);
    }

    createComment(publicationId: number, content: string): Observable<Comment> {
        return this.api.post<Comment>('comments/', {
            publication: publicationId,
            content: content
        });
    }

    deleteComment(id: number): Observable<any> {
        return this.api.delete<any>(`comments/${id}/`);
    }
}