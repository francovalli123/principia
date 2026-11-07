import { Publication } from "./publication";
import { Author } from "./user";
export interface Comment {
	id: number;
	owner: Author | number;
	publication: Publication["id"];
	content: string;
	creation_date: string;
}
