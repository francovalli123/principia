export interface Publication {
    id: number;
    title: string;
    description: string;
    simulation: number;
    owner: number;
    forum: number | null;
    creation_date: string;
}