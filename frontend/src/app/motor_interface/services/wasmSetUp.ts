import { Injectable } from '@angular/core'; 
import { Observable, tap, throwError } from 'rxjs'; // Types the backend request as an observable
import { BaseApiService } from '../../services/base-api.service'; 
import { WASM_REGISTRY } from '../wasmRegistry';
import {
    SimulationDescriptor, 
    SimulationEngine
} from './wasm.types'; 

// Describes a successful backend configuration envelope
interface ConfigResponse { 
    status: 'success'; 
    data: unknown; // Leaves phenomenon-specific validation to its adapter
}

@Injectable({
    providedIn: 'root' // Shares one setup-service instance across the application (Singleton)
})

// Loads configuration and delegates engine setup
export class WasmSetupService { 
    constructor(private readonly api: BaseApiService) {} // Injects the shared HTTP service

    getConfig(simulationId: number): Observable<unknown> { // Requests one simulation's saved parameters
        if (!Number.isSafeInteger(simulationId) || simulationId <= 0) {
            return throwError(() => new Error('A valid simulation ID is required to load its configuration'));
        }
        console.log(`Requesting configuration for simulation ID: ${simulationId}`);
        return this.api.get<unknown>(`phenomenonConfig/${simulationId}/`).pipe(
            tap({
                next: () => console.log(`Received configuration for simulation ID: ${simulationId}`),
                error: (error: unknown) => console.error(`Failed to load configuration for simulation ID: ${simulationId}`, error),
            })
        ); // Leaves phenomenon payload validation to its adapter
    }

    async loadEngine(
        simulation: SimulationDescriptor, // Provides the phenomenon used for adapter lookup
        response: unknown,
        canvas: HTMLCanvasElement,
    ): Promise<SimulationEngine> {
        //console.log(`Loading engine for simulation ID: ${simulation.id}`);
        const config = parseConfigResponse(response);
        const adapter = Object.prototype.hasOwnProperty.call(
            WASM_REGISTRY,
            simulation.phenomenon_type
        )
            ? WASM_REGISTRY[
                  simulation.phenomenon_type as keyof typeof WASM_REGISTRY
              ]
            : undefined;

        if (!adapter) {
            throw new Error(
                `Unsupported phenomenon type: ${simulation.phenomenon_type}`
            );
        }
       // console.log(`Loading engine for phenomenon type: ${simulation.phenomenon_type}`);
        return adapter.load(config.data, canvas); // Lets the selected adapter validate its parameters and bind its rendering surface
    }
}

// Checks the shared backend response shape at runtime
function parseConfigResponse(response: unknown): ConfigResponse { 
    if (
        typeof response !== 'object' ||
        response === null ||
        !('status' in response) ||
        response.status !== 'success' ||
        !('data' in response)
    ) {
        throw new Error('The simulation configuration response is invalid'); 
    }

    return { status: 'success', data: response.data }; 
}
