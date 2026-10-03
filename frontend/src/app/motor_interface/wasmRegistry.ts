import { createObliqueProjectileEngine } from './engines/oblique-projectile.engine'; 
import { SimulationEngineAdapter } from './services/wasm.types'; 

export const WASM_REGISTRY = { 
    'Oblique Projectile Motion': {
        load: createObliqueProjectileEngine
    }
} satisfies Record<string, SimulationEngineAdapter>;
