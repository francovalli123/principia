export type SimulationVisibility = 'public' | 'hidden' | 'private';

export interface Simulation {
    id: number;
    owner: number;
    phenomenon_type: string;
    visibility: SimulationVisibility;
    creation_date: string;
}