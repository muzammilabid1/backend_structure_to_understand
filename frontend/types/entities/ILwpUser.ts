import { UserStatus } from 'lwp-shared';

export interface ILwpUser {
    id: string;
    firstname: string;
    lastname: string;
    email?: string;
    phoneNumber?: string;
    userStatus?: UserStatus;
}
