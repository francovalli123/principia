import {
    EngineControl, // Describes controls shown by this phenomenon.
    EngineMetric, 
    EngineSnapshot, // Defines the shared state shape returned to the UI.
    EngineStatus, 
    SimulationEngine 
} from '../services/wasm.types'; 

// Declares exports required from the projectile WASM module
export interface ObliqueProjectileWasmRuntime {
    _pauseSim(): void; 
    _resetSim(): void; 
    _getSimTime(): number; 
    _getSimX(): number; 
    _getSimY(): number; 
    _getSimStatus(): number; 
}

// Matches the projectile configuration stored by the backend
interface ProjectileParameters { 
    initial_velocity: number; 
    angle: number; 
    initial_height: number; 
}

// Describes the Emscripten module initialization options
interface ProjectileModuleOptions { 
    arguments: string[]; 
}

export type ProjectileModuleFactory = (
    options: ProjectileModuleOptions // Passes initialization arguments to Emscripten.
) => Promise<ObliqueProjectileWasmRuntime>; // Resolves when the WASM runtime is ready.

// Describes the Emscripten module initialization options
export const OBLIQUE_PROJECTILE_CONTROLS: readonly EngineControl[] = [ 
    {
        id: 'pause', 
        label: 'Reanudar', 
        labelWhenRunning: 'Pausar', 
        disabledWhenCompleted: true // Prevents pausing or resuming after completion
    },
    { id: 'reset', label: 'Reiniciar' } // Offers a reset command in every state
];

export async function createObliqueProjectileEngine(
    parameters: unknown // Accepts untrusted backend data for adapter-specific validation.
): Promise<SimulationEngine> {
    const validatedParameters = parseProjectileParameters(parameters);
    const importedModule = await import(
        '../../../wasm/obliqueProjectile/index.js' // Loads the generated Emscripten module on demand.
    ); 
    const createModule: unknown = importedModule.default; 
    if (typeof createModule !== 'function') {
        throw new Error('The WebAssembly module has no valid factory');
    }

    const runtime = await (createModule as ProjectileModuleFactory)({
        arguments: [ // Uses the positional order expected by the C program
            validatedParameters.initial_height, 
            validatedParameters.angle, 
            validatedParameters.initial_velocity 
        ].map(String) // Converts command-line arguments to strings
    }); 
    validateProjectileRuntime(runtime); 

    return new ObliqueProjectileEngine(runtime); 
}

// Validates this phenomenon's configuration shape
function parseProjectileParameters(value: unknown): ProjectileParameters { 
    if (typeof value !== 'object' || value === null) {
        throw new Error('Projectile parameters must be an object'); // Rejects null and non-object configuration values
    }

    const parameters = value as Record<string, unknown>; // Allows runtime checks before accessing unknown fields
    const { initial_velocity, angle, initial_height } = parameters; // Extracts the fields required by this engine
    if (
        typeof initial_velocity !== 'number' ||
        typeof angle !== 'number' ||
        typeof initial_height !== 'number' ||
        ![initial_velocity, angle, initial_height].every(Number.isFinite)
    ) {
        throw new Error('Projectile parameters must all be finite numbers'); // Rejects missing, nonnumeric, NaN, or infinite values
    }

    return { initial_velocity, angle, initial_height }; // Returns a typed parameter object after validation
}

function validateProjectileRuntime(
    runtime: ObliqueProjectileWasmRuntime // Receives the newly initialized Emscripten runtime
): void {
    for (const method of [
        '_pauseSim', 
        '_resetSim', 
        '_getSimTime', 
        '_getSimX', 
        '_getSimY', 
        '_getSimStatus' 
    ] as const) { // Retains literal types for safe runtime property access
        if (typeof runtime[method] !== 'function') {
            throw new Error(`The WebAssembly module is missing ${method}`); 
        }
    }
}

// Concrete adapter that Adapts projectile-specific WASM calls to the shared contract.
class ObliqueProjectileEngine implements SimulationEngine { 
    readonly controls = OBLIQUE_PROJECTILE_CONTROLS; // Exposes the controls this adapter supports.

    constructor(private readonly runtime: ObliqueProjectileWasmRuntime) {} // Retains the initialized runtime.

    readSnapshot(): EngineSnapshot { 
        return parseProjectileSnapshot(this.runtime); 
    }

    // Maps generic UI control identifiers to C exports.
    execute(controlId: string): void { 
        switch (controlId) { // Selects the requested projectile command.
            case 'pause':
                this.runtime._pauseSim(); // Toggles pause or resume in the C engine.
                return; 
            case 'reset':
                this.runtime._resetSim(); // Restores time and coordinates in the C engine.
                return; 
            default:
                throw new Error(`Unsupported projectile control: ${controlId}`); // Rejects unknown commands explicitly.
        }
    }

    destroy(): void { // Stops an active engine when its UI component is removed.
        if (this.runtime._getSimStatus() === 1) {
            this.runtime._pauseSim(); // Avoids leaving the simulation running after cleanup.
        }
    }
}

export function parseProjectileSnapshot(
    runtime: ObliqueProjectileWasmRuntime // Reads the projectile-specific WASM API.
): EngineSnapshot {
    const status = parseProjectileStatus(runtime._getSimStatus()); // Converts the C status code to a shared string.
    const metrics: EngineMetric[] = [ // Names and units the projectile UI should display.
        {
            id: 'time', 
            label: 'Tiempo', 
            value: runtime._getSimTime(), 
            unit: 's' 
        },
        {
            id: 'horizontal-position', 
            label: 'Posición horizontal', 
            value: runtime._getSimX(), 
            unit: 'm' 
        },
        {
            id: 'vertical-position', 
            label: 'Posición vertical', 
            value: runtime._getSimY(), 
            unit: 'm' 
        }
    ]; // Completes the generic metric list for this phenomenon
    if (!metrics.every((metric) => Number.isFinite(metric.value))) {
        throw new Error('Simulation state contains a non-finite value'); // Prevents invalid numeric results from reaching the UI
    }

    return { status, metrics }; // Returns one generic snapshot for the controller
}

// Maps C's integer state codes to the shared lifecycle type
function parseProjectileStatus(statusCode: number): EngineStatus { 
    // Handles every status code currently exported by the C engine
    switch (statusCode) { 
        case 0:
            return 'paused'; 
        case 1:
            return 'running'; 
        case 2:
            return 'completed'; 
        default:
            throw new Error(`Unknown simulation status code: ${statusCode}`); 
    }
}
