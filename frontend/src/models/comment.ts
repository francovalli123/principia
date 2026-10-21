import { Publication } from "./publication";
import { User } from "./user";
export interface Comment {
	id: number;
	owner: User;
	publication: Publication["id"];
	content: string;
	creation_date: string;
}
