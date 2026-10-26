import { PupilSourceType } from 'lwp-shared';

export interface IPupilSummary {
    id: string;
    firstname: string;
    lastname: string;
    dateOfBirth?: string;
    UPN?: string;
    sourceType?: PupilSourceType;
    pupilClass?: {
        id: string;
        name: string;
        yearGroup?: string;
    };
    isPreviouslyLinked?: boolean;
}

export interface IClassSummary {
    id: string;
    name: string;
    yearGroup: string;
}

export interface ParentDetails {
    firstname: string;
    lastname: string;
    email: string | null;
    phoneNumber: string | null;
    /** Platform-side link status (PupilParentStatus); absent for imported contacts. */
    status?: string | null;
}

export interface PupilDetails {
    id: string;
    firstname: string;
    lastname: string;
    schoolClassName: string;
    UPN: string;
    gender: string;
    dateOfBirth: moment.MomentInput;
    yearGroup: string;
    parents: ParentDetails[];
    /** Platform pupils only. */
    feedbackCount?: number | null;
    lastActivity?: string | null;
    pupilStatus?: string | null;
    isPreviouslyLinked?: boolean | null;
}

export enum LinkFilterCategory {
    ALL = 'All',
    SUGGESTED_MATCHES = 'SUGGESTED_MATCHES',
    LOW_CONFIDENCE_MATCHES = 'LOW_CONFIDENCE_MATCHES',
    UNMATCHED = 'UNMATCHED'
}
