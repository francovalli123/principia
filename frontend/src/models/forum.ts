import { User } from "./user";
export interface Forum {
	id: number;
	name: string;
	description: string;
	creation_date: string;
	owner: User | number;
	member_count: number;
	is_member: boolean;
	is_owner: boolean;
}
