import { User } from "./user";
export type SimulationVisibility = 'public' | 'hidden' | 'private';

export interface Simulation {
    id: number;
    owner: User;
    phenomenon_type: string;
    visibility: SimulationVisibility;
    creation_date: string;
}