import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Simulation } from '../../models/simulation';

export interface ApiResponse<T> {
    status: string;
    data: T;
}

export type SimulationListResponse = Simulation[] | {
    data?: Simulation[] | { results?: Simulation[] } | null;
    results?: Simulation[];
};

export interface SimulationFavourite {
    id: number;
    simulation: number;
    marked_date: string;
}

export type SimulationFavouriteListResponse = SimulationFavourite[] | {
    data?: SimulationFavourite[] | { results?: SimulationFavourite[] } | null;
    results?: SimulationFavourite[];
};

@Injectable({
    providedIn: 'root'
})
export class SimulationApiService {
    constructor(private api: BaseApiService) {}

    getPhenomena(): Observable<ApiResponse<string[]> | string[]> {
        return this.api.get<ApiResponse<string[]> | string[]>('phenomena/');
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
        return this.api.get<SimulationListResponse>(`simulations/?owner_id=${ownerId}`).pipe(
            map((response) => {
                if (Array.isArray(response)) return response;
                const payload = response.data ?? response;
                return Array.isArray(payload) ? payload : payload.results ?? [];
            }),
        );
    }

    createSimulation(
        phenomenonType: string,
        visibility: string,
        parameters: any
    ): Observable<ApiResponse<Simulation>> {
        return this.api.post<ApiResponse<Simulation>>('simulations/', {
            phenomenon_type: phenomenonType,
            visibility: visibility,
            parameters: parameters
        });
    }

    getFavourites(): Observable<SimulationFavourite[]> {
        return this.api.get<SimulationFavouriteListResponse>('simulations/favourites/').pipe(
            map((response) => {
                if (Array.isArray(response)) return response;
                const payload = response.data ?? response;
                return Array.isArray(payload) ? payload : payload.results ?? [];
            }),
        );
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