import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class PublicationApiService {
    constructor(private api: BaseApiService) {}

    getPublication(id: number): Observable<any> {
        return this.api.get<any>(`publications/${id}/`);
    }

    getByForum(forumId: number): Observable<any> {
        return this.api.get<any>(`publications/?forum_id=${forumId}`);
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

        return this.api.post<any>('publications/', body);
    }

    deletePublication(id: number): Observable<any> {
        return this.api.delete<any>(`publications/${id}/`);
    }
}