import { User } from "./user";
export type SimulationVisibility = 'public' | 'hidden' | 'private';

export interface Simulation {
    id: number;
    owner: User;
    title: string;
    phenomenon_type: string;
    visibility: SimulationVisibility;
    allow_cloning: boolean;
    creation_date: string;
}