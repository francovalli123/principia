import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Simulation } from '../../models/simulation';

export interface ApiResponse<T> {
    status: string;
    data: T;
}

export type SimulationResponse = ApiResponse<Simulation> | Simulation;

export type SimulationCreationResponse = ApiResponse<Simulation> | Simulation;

export interface UpdateSimulation {
    title?: string;
    visibility?: Simulation['visibility'];
    parameters?: Record<string, number>;
}

export type SimulationListResponse = Simulation[] | {
    data?: Simulation[] | { results?: Simulation[] } | null;
    results?: Simulation[];
};

export interface SimulationFavourite {
    id: number;
    simulation: number;
    simulation_details: Simulation;
    publication: {
        id: number;
        forum: number | null;
    } | null;
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
        return this.api.get<SimulationResponse>(
            `simulations/?publication_id=${publicationId}`
        ).pipe(
            map((response) => {
                if (
                    typeof response === 'object' &&
                    response !== null &&
                    'data' in response
                ) {
                    return response.data;
                }
                return response;
            }),
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

    updateSimulation(simulationId: number, data: UpdateSimulation): Observable<Simulation> {
        return this.api.patch<SimulationResponse>(`simulations/${simulationId}/`, data).pipe(
            map((response) => {
                if (
                    typeof response === 'object' &&
                    response !== null &&
                    'data' in response
                ) {
                    return response.data;
                }
                return response;
            }),
        );
    }

    deleteSimulation(simulationId: number): Observable<void> {
        return this.api.delete<void>(`simulations/${simulationId}/`);
    }

    createSimulation(
        title: string,
        description: string,
        phenomenonType: string,
        visibility: string,
        allowCloning: boolean,
        parameters: Record<string, number>,
    ): Observable<SimulationCreationResponse> {
        return this.api.post<SimulationCreationResponse>('simulations/', {
            title,
            description,
            phenomenon_type: phenomenonType,
            visibility,
            allow_cloning: allowCloning,
            parameters,
        });
    }

    getFavourites(): Observable<SimulationFavourite[]> {
        return this.api.get<SimulationFavouriteListResponse>('simulations/favourites/').pipe(
            map((response) => {
                let favourites: SimulationFavourite[];
                if (Array.isArray(response)) {
                    favourites = response;
                } else {
                    const payload = response.data ?? response;
                    favourites = Array.isArray(payload) ? payload : payload.results ?? [];
                }
                const seenSimulationIds = new Set<number>();
                return favourites.filter((favourite) => {
                    if (seenSimulationIds.has(favourite.simulation)) return false;
                    seenSimulationIds.add(favourite.simulation);
                    return true;
                });
            }),
        );
    }

    getFavourite(simulationId: number): Observable<SimulationFavourite> {
        return this.api.get<ApiResponse<SimulationFavourite>>(
            `simulations/favourites/${simulationId}/`,
        ).pipe(map((response) => response.data));
    }

    addFavourite(simulationId: number, publicationId: number): Observable<SimulationFavourite> {
        return this.api.post<ApiResponse<SimulationFavourite>>(
            `simulations/favourites/${simulationId}/`,
            { publication_id: publicationId },
        ).pipe(map((response) => response.data));
    }

    removeFavourite(simulationId: number): Observable<void> {
        return this.api.delete<void>(`simulations/favourites/${simulationId}/`);
    }

    cloneSimulation(simulationId: number, publicationId: number): Observable<Simulation> {
        return this.api.post<ApiResponse<Simulation>>(
            `simulations/${simulationId}/clone/`,
            { publication_id: publicationId },
        ).pipe(map((response) => response.data));
    }
}