export interface Forum {
	id: number;
	name: string;
	description: string;
	creation_date: string;
	owner: number | null;
	member_count: number;
}

