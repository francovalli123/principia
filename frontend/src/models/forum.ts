import { User } from "./user";
export interface Forum {
	id: number;
	name: string;
	creation_date: string;
	owner: User;
	member_count: number;
}

