import { useQuery } from '@apollo/client';
import { SchoolImpactReportType } from 'lwp-shared';
import React, { useEffect, useMemo } from 'react';

import { getSchoolImpactReport, getSchoolImpactReportForAdmin } from '../../../../graphQl/queries';
import { ILwpSchoolImpactReport } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonLoading from '../../../Shared/CommonLoading';
import TopicAndActivityImpactReportOutput from './TopicAndActivityImpactReportOutput';

interface TopicAndActivityImpactReportProps {
    termId: string;
    schoolId: string;
    isAdminView?: boolean;
    onDataLoad?: (data: ILwpSchoolImpactReport) => void;
}

const TopicAndActivityImpactReport = ({ termId, schoolId, isAdminView = false, onDataLoad }: TopicAndActivityImpactReportProps) => {
    const { data, loading, refetch } = useQuery(isAdminView ? getSchoolImpactReportForAdmin : getSchoolImpactReport, {
        variables: {
            schoolId,
            termId,
            reportType: SchoolImpactReportType.TOPIC_ACTIVITY
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

    const refetchTopicsImpactReportData = () => {
        refetch({
            schoolId,
            termId,
            reportType: SchoolImpactReportType.TOPIC_ACTIVITY
        });
    };

    if (loading) return <CommonLoading />;

    return (
        <TopicAndActivityImpactReportOutput
            schoolImpactReportData={schoolImpactReport}
            isAdminView={isAdminView}
            refetch={refetchTopicsImpactReportData}
        />
    );
};

export default TopicAndActivityImpactReport;
