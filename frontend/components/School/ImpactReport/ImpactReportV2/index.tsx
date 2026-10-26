import { useQuery } from '@apollo/client';
import { useEffect, useMemo } from 'react';

import { getV2SchoolImpactReport } from '../../../../graphQl/queries';
import { ILwpSchoolImpactReportV2 } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonLoading from '../../../Shared/CommonLoading';
import ImpactReportV2Output from './ImpactReportV2Output';

interface ImpactReportV2PreviewProps {
    schoolId: string;
    termId: string;
    isAdminView?: boolean;
    onDataLoad?: (data: ILwpSchoolImpactReportV2) => void;
}

const ImpactReportV2 = ({ schoolId, termId, isAdminView, onDataLoad }: ImpactReportV2PreviewProps) => {
    const { data, loading, refetch } = useQuery(getV2SchoolImpactReport, {
        variables: {
            schoolId,
            termId,
            isPublished: isAdminView ? false : true // In Admin View, we can fetch the most recent report for the selected term, whether it’s published or not. For school side, only published reports can be fetched.
        }
    });

    useEffect(() => {
        if (data?.getV2SchoolImpactReport && onDataLoad) {
            onDataLoad(data.getV2SchoolImpactReport);
        }
    }, [data]);

    const schoolImpactReport: ILwpSchoolImpactReportV2 = useMemo(() => {
        if (!data) return null;

        return data?.getV2SchoolImpactReport;
    }, [data]);

    if (loading) return <CommonLoading />;

    return (
        <ImpactReportV2Output
            schoolImpactReport={schoolImpactReport}
            isAdminView={isAdminView}
            schoolId={schoolId}
            termId={termId}
            refetch={refetch}
        />
    );
};

export default ImpactReportV2;
