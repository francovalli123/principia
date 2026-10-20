import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import {Publication} from '../../models/publication';
@Injectable({
    providedIn: 'root'
})
export class PublicationApiService {
    constructor(private api: BaseApiService) {}

    getPublication(id: number): Observable<Publication> {
        return this.api.get<Publication>(`publications/${id}/`);
    }

    getByForum(forumId: number): Observable<Publication[]> {
        return this.api.get<Publication[]>(`publications/?forum_id=${forumId}`);
    }

    createPublication(
        title: string,
        description: string,
        simulationId: number,
        forumId?: number
    ): Observable<Publication> {
        const body: any = {
            title: title,
            description: description,
            simulation: simulationId
        };

        if (forumId !== undefined) {
            body.forum = forumId;
        }

        return this.api.post<Publication>('publications/', body);
    }

    deletePublication(id: number): Observable<Publication> {
        return this.api.delete<Publication>(`publications/${id}/`);
    }
}