import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SimulationApiService {
    private baseUrl = 'http://127.0.0.1:8000/api';

    constructor(private http: HttpClient) {}

    getPhenomena(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/phenomena/`);
    }

    getPhenomenonConfig(simulationId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/phenomenonConfig/${simulationId}/`
        );
    }

    getByPublication(publicationId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/simulations/?publication_id=${publicationId}`
        );
    }

    getByOwner(ownerId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/simulations/?owner_id=${ownerId}`
        );
    }

    createSimulation(
        phenomenonType: string,
        visibility: string,
        parameters: any
    ): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/simulations/`,
            {
                phenomenon_type: phenomenonType,
                visibility: visibility,
                parameters: parameters
            }
        );
    }

    getFavourites(): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/simulations/favourites/`
        );
    }

    getFavourite(simulationId: number): Observable<any> {
        return this.http.get<any>(
            `${this.baseUrl}/simulations/favourites/${simulationId}/`
        );
    }

    addFavourite(simulationId: number): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/simulations/favourites/${simulationId}/`,
            {}
        );
    }

    removeFavourite(simulationId: number): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/simulations/favourites/${simulationId}/`
        );
    }
}