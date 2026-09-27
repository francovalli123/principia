import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Injectable } from '@angular/core'
import { Observable } from 'rxjs';
import {WASM_REGISTRY} from '../wasmRegistry';
@Injectable({
    providedIn: 'root'
})
//WasmSetupService is the class  responsible for getting the parameters of a simulation and
//creating the executable file (the simulation)
@Service()
export class WasmSetupService {
    constructor(private http: HttpClient){}
    configUrl = "http://127.0.0.1:8000/api/phenomenonConfig";
    
    getConfig(simulationId: number): Observable<any> {
        return this.http.get<any>(`${this.configUrl}/${simulationId}/`);
    }
 
    async setupWasmModule(obj: any): Promise<void> {
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
    return wasmModule
    }

}




//This is the class responsible for communicating with the simulation.
export class SimController {
    pause(): void {
        //This method should pause the simulation.
    }
    resume(): void {
        //This method should resume the simulation.
    }
    reset(): void {
        //This method should reset the simulation to its initial state.
    }

}
