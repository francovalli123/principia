import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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

interface CommentResponse {
    status: string;
    data: Comment;
}

@Injectable({
    providedIn: 'root'
})

export class CommentApiService {
    constructor(private api: BaseApiService) {}

    getComments(publicationId: number, page = 1): Observable<PaginatedResponse<Comment>> {
        return this.api.get<PaginatedResponse<Comment>>(
            `comments/?publication_id=${publicationId}&page=${page}`
        );
    }

    getComment(id: number): Observable<Comment> {
        return this.api.get<Comment>(`comments/${id}/`);
    }

    createComment(publicationId: number, content: string): Observable<Comment> {
        return this.api.post<CommentResponse>('comments/', {
            publication: publicationId,
            content: content
        }).pipe(map((response) => response.data));
    }

    deleteComment(id: number): Observable<unknown> {
        return this.api.delete<unknown>(`comments/${id}/`);
    }
}