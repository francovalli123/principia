import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Simulation } from '../../models/simulation';
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

    getByPublication(publicationId: number): Observable<Simulation> {
        return this.api.get<Simulation>(
            `simulations/?publication_id=${publicationId}`
        );
    }

    getByOwner(ownerId: number): Observable<Simulation[]> {
        return this.api.get<Simulation[]>(`simulations/?owner_id=${ownerId}`);
    }

    createSimulation(
        phenomenonType: string,
        visibility: string,
        parameters: any
    ): Observable<Simulation> {
        return this.api.post<Simulation>('simulations/', {
            phenomenon_type: phenomenonType,
            visibility: visibility,
            parameters: parameters
        });
    }

    getFavourites(): Observable<Simulation[]> {
        return this.api.get<Simulation[]>('simulations/favourites/');
    }

    getFavourite(simulationId: number): Observable<Simulation> {
        return this.api.get<Simulation>(`simulations/favourites/${simulationId}/`);
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