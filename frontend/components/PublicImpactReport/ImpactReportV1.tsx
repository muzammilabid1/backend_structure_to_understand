import { SchoolImpactReportType } from 'lwp-shared';
import { useEffect, useMemo, useState } from 'react';

import { ILwpSchoolImpactReport } from '../../types/entities/ILwpSchoolImpactReport';
import ReadingImpactReportOutput from '../School/ImpactReport/ReadingImpactReport/ReadingImpactReportOutput';
import TopicAndActivityImpactReportOutput from '../School/ImpactReport/TopicAndActivityImpactReport/TopicAndActivityImpactReportOutput';
import CommonTabs from '../Shared/CommonTabs';

interface ImpactReportV1Props {
    impactReports: {
        topicsVersion: ILwpSchoolImpactReport | null;
        readingVersion: ILwpSchoolImpactReport | null;
        reportType: SchoolImpactReportType;
    };
}

const ImpactReportV1 = ({ impactReports }: ImpactReportV1Props) => {
    const [tabValue, setTabValue] = useState<number>(0);

    const tabs: string[] = useMemo(() => {
        const hasTopicsVersion = !!impactReports?.topicsVersion;
        const hasReadingVersion = !!impactReports?.readingVersion;

        return [...(hasTopicsVersion ? ['Topic and activities'] : []), ...(hasReadingVersion ? ['Reading'] : [])];
    }, [impactReports]);

    useEffect(() => {
        const impactReportData = impactReports;

        if (
            impactReportData?.reportType === SchoolImpactReportType.READING &&
            !!impactReportData?.readingVersion &&
            !!impactReportData?.topicsVersion
        ) {
            setTabValue(1);
        }
    }, [impactReports]);

    const renderImpactReport = (): React.JSX.Element => {
        const { topicsVersion, readingVersion, reportType } = impactReports;

        if (reportType === SchoolImpactReportType.TOPIC_ACTIVITY && !readingVersion)
            return <TopicAndActivityImpactReportOutput schoolImpactReportData={topicsVersion} />;

        if (reportType === SchoolImpactReportType.READING && !topicsVersion)
            return <ReadingImpactReportOutput schoolImpactReportData={readingVersion} />;

        const components: React.JSX.Element[] = [
            <TopicAndActivityImpactReportOutput schoolImpactReportData={topicsVersion} />,
            <ReadingImpactReportOutput schoolImpactReportData={readingVersion} />
        ];

        return components[tabValue] || null;
    };

    return (
        <CommonTabs tebs={tabs} value={tabValue} onChange={setTabValue}>
            {renderImpactReport()}
        </CommonTabs>
    );
};

export default ImpactReportV1;
