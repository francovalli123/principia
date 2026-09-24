import { Service } from '@angular/core';
//WasmSetupService is the class  responsible for getting the parameters of a simulation and
//creating the executable file (the simulation)
@Service()
export class WasmSetupService {
    configUrl = "http://127.0.0.1:8000/api/phenomenonConfig";

    getConfig(simulationId: number): string {
        //This method returns the JSON configuration for the WebAssembly module.
        return this.http.get<Config>(`${this.configUrl}/${simulationId}/`);
    }
    parseConfig(config: string): any {
        //This method parses the JSON configuration  and return an object.
        return JSON.parse(config);
    }
    setupWasmModule(config: any): void {
        //This method should set up the WebAssembly module using the provided configuration.
        //Implementation details would depend on the specific WebAssembly module being used.
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
