export type GetPupilData = {
    pupil: {
        id: string;
        school: {
            id: string;
        } | null;
        UPN: string | null;
        firstname: string;
        lastname: string;
        fullname: string;
        dateOfBirth: string | null;
        gender: string | null;
        yearGroup: string | null;
        currentClass: {
            name: string;
        } | null;
        parents: Array<{
            parent: {
                firstname: string;
                lastname: string;
                email: string | null;
                phoneNumber: string | null;
            };
        }> | null;
    };
};

export type PupilInfo = {
    id: string;
    school: {
        id: string;
    } | null;
    UPN: string | null;
    firstname: string;
    lastname: string;
    fullname: string;
    dateOfBirth: Date | null;
    gender: string | null;
    yearGroup: string | null;
    schoolClassName: string | null;
    parents: Array<{
        firstname: string;
        lastname: string;
        email: string | null;
        phoneNumber: string | null;
    }> | null;
};
