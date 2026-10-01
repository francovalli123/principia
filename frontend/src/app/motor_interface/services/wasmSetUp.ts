import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WASM_REGISTRY } from '../wasmRegistry';

@Injectable({
    providedIn: 'root'
})
// WasmSetupService gets the simulation configuration and loads
// the corresponding WebAssembly module.
export class WasmSetupService {
    constructor(private http: HttpClient) {}

    configUrl = "http://127.0.0.1:8000/api/phenomenonConfig";

    getConfig(simulationId: number): Observable<any> {
        return this.http.get<any>(`${this.configUrl}/${simulationId}/`);
    }

    async setupWasmModule(obj: any): Promise<any> {
        const phenomenonType = obj.simulation.phenomenon_type as keyof typeof WASM_REGISTRY;
        const config = WASM_REGISTRY[phenomenonType];

        if (!config) {
            throw new Error(`Unsupported phenomenon type: ${phenomenonType}`);
        }

        const params = config.getParams(obj);
        const importedModule = await config.load();
        const createModule = importedModule.default;

        const wasmModule = await createModule({
            arguments: params
        });

        return wasmModule;
    }
}


// This is the class responsible for communicating with the simulation.
// For this to work, the simulation code must export the functions to WASM.
export class SimController {
    private wasmModule: any;

    constructor(wasmModule: any) {
        this.wasmModule = wasmModule;
    }

    pause(): void {
        this.wasmModule._pauseSim();
    }

    reset(): void {
        this.wasmModule._resetSim();
    }
}
