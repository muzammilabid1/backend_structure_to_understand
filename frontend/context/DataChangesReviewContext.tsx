import { gql, useQuery } from '@apollo/client';
import { ImportStatus } from 'lwp-shared';
import { useParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import CommonLoading from '../components/Shared/CommonLoading';
import { ILwpSchool } from '../types/entities/ILwpSchool';

interface DataChangesReviewContextProps {
    schoolId: string;
    importedSchoolId: string;
    schoolStatus: ImportStatus | null;
    setSchoolStatus: React.Dispatch<React.SetStateAction<string>>;
    school?: ILwpSchool;
}

const DataChangesReviewContext = createContext<DataChangesReviewContextProps | undefined>(undefined);

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            importStatus
            misName
            lastImportedAt
            importedSchool {
                id
            }
        }
    }
`;

export const DataChangesReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const params = useParams();
    const schoolId = params.school_id as string;

    const [schoolStatus, setSchoolStatus] = useState<ImportStatus>(null);

    const { data, loading } = useQuery(getSchool, {
        variables: { id: schoolId }
    });

    useEffect(() => {
        if (data?.getSchool) {
            setSchoolStatus(data.getSchool?.importStatus);
        }
    }, [data]);

    const contextValue: DataChangesReviewContextProps = useMemo(() => {
        const school: ILwpSchool = data?.getSchool;

        return {
            schoolId,
            importedSchoolId: school?.importedSchool?.id,
            school,
            schoolStatus,
            setSchoolStatus
        };
    }, [schoolId, data, schoolStatus, setSchoolStatus]);

    if (loading) return <CommonLoading />;

    return <DataChangesReviewContext.Provider value={contextValue}>{children}</DataChangesReviewContext.Provider>;
};

export const useDataChangesReview = () => {
    const context = useContext(DataChangesReviewContext);

    if (!context) {
        throw new Error('useDataChangesReview must be used within a DataChangesReviewProvider');
    }

    return context;
};
