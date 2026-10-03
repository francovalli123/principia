import type { ObliqueProjectileWasmRuntime } from '../../app/motor_interface/engines/oblique-projectile.engine'; 

declare function createModule(options: { 
    arguments: string[]; 
}): Promise<ObliqueProjectileWasmRuntime>; 

export default createModule; 