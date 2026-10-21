import { Forum } from "./forum";
import { User } from "./user";
import { Simulation } from "./simulation";
export interface Publication {
    id: number;
    title: string;
    description: string;
    simulation: Simulation;
    owner: User;
    forum: Forum | null;
    creation_date: string;
}