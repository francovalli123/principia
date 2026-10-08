import type { Simulation } from '../../../models/simulation';

// Identifies the saved simulation selected by the UI
export type SimulationDescriptor = Pick<Simulation, 'id' | 'phenomenon_type'>;

export type EngineStatus = 'paused' | 'running' | 'completed'; 

// Describes one displayable engine result
export interface EngineMetric { 
    id: string; 
    label: string; // Metric name
    value: number; 
    unit?: string; 
}

// Represents one complete engine-state reading
export interface EngineSnapshot { 
    status: EngineStatus;
    metrics: EngineMetric[];
}

// Defines every state the component may receive.
export type EngineState = 
    | EngineSnapshot // Contains valid engine data
    | { status: 'error'; message: string } 
    | { status: 'loading' }; 

// Describes a control provided by a specific engine
export interface EngineControl { 
    id: string; 
    label: string; // Defines the default button text
    labelWhenRunning?: string; // Optionally changes button text while the engine runs
    disabledWhenCompleted?: boolean; 
}

// Defines the phenomenon-independent engine contract
export interface SimulationEngine { 
    readonly controls: readonly EngineControl[]; // Publishes the controls supported by this engine.
    readSnapshot(): EngineSnapshot; 
    execute(controlId: string): void; // Executes one engine-specific control
    destroy(): void; 
}

// Defines how one phenomenon creates its engine
export interface SimulationEngineAdapter { 
    load(parameters: unknown): Promise<SimulationEngine>; // Validates its own parameters and initializes its runtime
}
