import { useQuery } from '@apollo/client';
import { SchoolImpactReportType } from 'lwp-shared';
import React, { useEffect, useMemo } from 'react';

import { getSchoolImpactReport, getSchoolImpactReportForAdmin } from '../../../../graphQl/queries';
import { ILwpSchoolImpactReport } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonLoading from '../../../Shared/CommonLoading';
import ReadingImpactReportOutput from './ReadingImpactReportOutput';

interface ReadingImpactReportProps {
    termId: string;
    schoolId: string;
    isAdminView?: boolean;
    onDataLoad?: (data: ILwpSchoolImpactReport) => void;
}

const ReadingImpactReport = ({ termId, schoolId, isAdminView = false, onDataLoad }: ReadingImpactReportProps) => {
    const { data, loading, refetch } = useQuery(isAdminView ? getSchoolImpactReportForAdmin : getSchoolImpactReport, {
        variables: {
            schoolId,
            termId,
            reportType: SchoolImpactReportType.READING
        }
    });

    const schoolImpactReport: ILwpSchoolImpactReport = useMemo(() => {
        if (!data) return null;

        return isAdminView ? data?.getSchoolImpactReportForAdmin : data?.getSchoolImpactReport;
    }, [data]);

    useEffect(() => {
        if (schoolImpactReport && onDataLoad) {
            onDataLoad(schoolImpactReport);
        }
    }, [schoolImpactReport]);

    if (loading) return <CommonLoading />;

    const refetchReadingImpactReportData = () => {
        refetch({
            schoolId,
            termId,
            reportType: SchoolImpactReportType.READING
        });
    };

    return (
        <ReadingImpactReportOutput
            schoolImpactReportData={schoolImpactReport}
            isAdminView={isAdminView}
            refetch={refetchReadingImpactReportData}
        />
    );
};

export default ReadingImpactReport;
