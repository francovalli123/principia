import { Forum } from "./forum";
import { Author } from "./user";
import { Simulation } from "./simulation";
export interface Publication {
    id: number;
    title: string;
    description: string;
    simulation: number | Simulation;
    owner: Author | number;
    forum: Forum | null;
    creation_date: string;
}