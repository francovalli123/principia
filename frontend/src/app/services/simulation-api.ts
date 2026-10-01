import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
})
export class SimulationApiService {
    constructor(private api: BaseApiService) {}

    getPhenomena(): Observable<any> {
        return this.api.get<any>('phenomena/');
    }

    getPhenomenonConfig(simulationId: number): Observable<any> {
        return this.api.get<any>(`phenomenonConfig/${simulationId}/`);
    }

    getByPublication(publicationId: number): Observable<any> {
        return this.api.get<any>(
            `simulations/?publication_id=${publicationId}`
        );
    }

    getByOwner(ownerId: number): Observable<any> {
        return this.api.get<any>(`simulations/?owner_id=${ownerId}`);
    }

    createSimulation(
        phenomenonType: string,
        visibility: string,
        parameters: any
    ): Observable<any> {
        return this.api.post<any>('simulations/', {
            phenomenon_type: phenomenonType,
            visibility: visibility,
            parameters: parameters
        });
    }

    getFavourites(): Observable<any> {
        return this.api.get<any>('simulations/favourites/');
    }

    getFavourite(simulationId: number): Observable<any> {
        return this.api.get<any>(`simulations/favourites/${simulationId}/`);
    }

    addFavourite(simulationId: number): Observable<any> {
        return this.api.post<any>(
            `simulations/favourites/${simulationId}/`,
            {}
        );
    }

    removeFavourite(simulationId: number): Observable<any> {
        return this.api.delete<any>(`simulations/favourites/${simulationId}/`);
    }
}