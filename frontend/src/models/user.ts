export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

export type Author = Pick<User, 'id' | 'username' | 'first_name' | 'last_name'>;

export interface UpdateUser {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
}

export interface Profile {
    id: number;
    user: number;
    bio: string | null;
    visible_name: string | null;
    profile_picture: string | null;
    creation_date: string;
}
