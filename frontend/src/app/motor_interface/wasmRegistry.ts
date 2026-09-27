export const WASM_REGISTRY = {
    "Oblique Projectile Motion": {
        load: () => import("../../wasm/obliqueProjectile/index.js"),
        getParams: (obj: any) => [
            obj.initial_velocity,
            obj.angle,
            obj.initial_height
        ]
    }
};