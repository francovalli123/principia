import { describe, expect, it, vi } from 'vitest';
import { parseProjectileSnapshot } from '../engines/oblique-projectile.engine';
import { SimController } from './simulation-engine.controller';
import { EngineState, SimulationEngine } from './wasm.types';

function createProjectileRuntime() {
    return {
        _pauseSim: vi.fn(),
        _resetSim: vi.fn(),
        _getSimTime: () => 1.25,
        _getSimX: () => 8.5,
        _getSimY: () => 3,
        _getSimStatus: () => 1
    };
}

function createEngine(): SimulationEngine {
    return {
        controls: [{ id: 'advance', label: 'Advance' }],
        readSnapshot: () => ({
            status: 'running',
            metrics: [
                { id: 'temperature', label: 'Temperature', value: 25, unit: 'C' }
            ]
        }),
        execute: vi.fn(),
        destroy: vi.fn()
    };
}

describe('Simulation engine adapters and controller', () => {
    it('translates the projectile runtime into generic metrics', () => {
        expect(parseProjectileSnapshot(createProjectileRuntime())).toEqual({
            status: 'running',
            metrics: [
                { id: 'time', label: 'Tiempo', value: 1.25, unit: 's' },
                {
                    id: 'horizontal-position',
                    label: 'Posición horizontal',
                    value: 8.5,
                    unit: 'm'
                },
                {
                    id: 'vertical-position',
                    label: 'Posición vertical',
                    value: 3,
                    unit: 'm'
                }
            ]
        });
    });

    it('rejects unknown projectile statuses and invalid results', () => {
        expect(() =>
            parseProjectileSnapshot({
                ...createProjectileRuntime(),
                _getSimStatus: () => 9
            })
        ).toThrow('Unknown simulation status code: 9');

        expect(() =>
            parseProjectileSnapshot({
                ...createProjectileRuntime(),
                _getSimX: () => Number.NaN
            })
        ).toThrow('Simulation state contains a non-finite value');
    });

    it('publishes generic engine state and forwards its controls', () => {
        const engine = createEngine();
        const controller = new SimController(engine);
        let latestState: EngineState = { status: 'loading' };
        const subscription = controller.state$.subscribe((state) => {
            latestState = state;
        });

        expect(latestState).toEqual({
            status: 'running',
            metrics: [
                { id: 'temperature', label: 'Temperature', value: 25, unit: 'C' }
            ]
        });
        expect(controller.controls).toEqual(engine.controls);

        controller.execute('advance');

        expect(engine.execute).toHaveBeenCalledWith('advance');
        expect(latestState.status).toBe('running');
        controller.destroy();
        subscription.unsubscribe();
        expect(engine.destroy).toHaveBeenCalledOnce();
    });
});
