import { UserStatus, UserType } from 'lwp-shared';

export interface IAuthToken {
    firstName: string;
    lastName: string;
    userType: UserType;
    status: UserStatus;
    pupilIds: Array<string> | null;
    isSchoolLeader: boolean;
    email: string | null;
    phoneNumber: string | null;
    userTrustLevel: number;
    iat: number;
    exp: number;
    sub: string;
}
