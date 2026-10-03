import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs'; 
import {
    EngineControl, 
    EngineSnapshot, 
    EngineState, 
    EngineStatus, 
    SimulationEngine 
} from './wasm.types'; // Imports shared simulation contracts

// Coordinates snapshots, controls, and engine cleanup
export class SimController { 
    private readonly stateSubject: BehaviorSubject<EngineState>; // Holds the latest state and emits changes
    private readonly polling: Subscription;
    readonly state$: Observable<EngineState>; 
    readonly controls: readonly EngineControl[]; // Shares adapter-defined controls with the UI

    // Receives any engine implementing the common contract
    constructor(private readonly engine: SimulationEngine) { 
        this.controls = engine.controls;
        this.stateSubject = new BehaviorSubject<EngineState>({
            status: 'loading' 
        });
        this.state$ = this.stateSubject.asObservable(); // Prevents consumers from calling subject mutation methods
        this.readState(); 
        this.polling = timer(100, 100).subscribe(() => { // Reads updates at a 100 ms interval
            if (
                this.stateSubject.value.status !== 'error' &&
                this.stateSubject.value.status !== 'completed'
            ) {
                this.readState(); 
            }
        });
    }
    
    // Sends a UI control request to the active engine
    execute(controlId: string): void { 
        try {
            this.engine.execute(controlId); // Delegates behavior instead of assuming WASM function names.
            this.readState(); 
        } catch (error) {
            this.publishError(error);
        }
    }

    // Releases controller and engine resources
    destroy(): void { 
        this.polling.unsubscribe(); 
        this.engine.destroy();
        this.stateSubject.complete(); // Notifies subscribers that no more states will arrive
    }
    
    // Reads and validates the adapter's generic snapshot
    private readState(): void { 
        try {
            this.stateSubject.next(validateSnapshot(this.engine.readSnapshot())); // Publishes only valid snapshots
        } catch (error) {
            this.publishError(error); 
        }
    }
    
    // Normalizes arbitrary thrown values for display
    private publishError(error: unknown): void { 
        this.stateSubject.next({
            status: 'error', // Switches the UI into its error presentation
            message:
                error instanceof Error
                    ? error.message
                    : 'Unable to read the simulation state'
        });
    }
}

// Enforces invariants shared by every adapter
function validateSnapshot(snapshot: EngineSnapshot): EngineSnapshot { 
    const validStatuses: EngineStatus[] = ['paused', 'running', 'completed'];
    if (!validStatuses.includes(snapshot.status)) {
        throw new Error(`Unknown simulation status: ${snapshot.status}`); 
    }
    if (!Array.isArray(snapshot.metrics)) {
        throw new Error('Simulation results must be an array of metrics'); // Prevents malformed results from reaching the template
    }

    const metricIds = new Set<string>(); // Tracks identities to detect duplicate metrics
    // Validates every result independently
    for (const metric of snapshot.metrics) { 
        if (
            !metric.id ||
            !metric.label ||
            typeof metric.value !== 'number' ||
            !Number.isFinite(metric.value) ||
            metricIds.has(metric.id)
        ) {
            throw new Error('Simulation results contain an invalid metric'); 
        }
        metricIds.add(metric.id); // Marks this metric identifier as already used
    }

    return snapshot; // Returns the snapshot only after all common checks pass
}
