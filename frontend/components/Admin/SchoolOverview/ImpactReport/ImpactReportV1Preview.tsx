import { SchoolImpactReportType } from 'lwp-shared';

import ReadingImpactReport from '../../../School/ImpactReport/ReadingImpactReport';
import TopicAndActivityImpactReport from '../../../School/ImpactReport/TopicAndActivityImpactReport';

interface ImpactReportV1PreviewProps {
    reportType: SchoolImpactReportType;
    schoolId: string;
    termId: string;
}

const ImpactReportV1Preview = ({ reportType, schoolId, termId }: ImpactReportV1PreviewProps) => {
    return reportType === SchoolImpactReportType.TOPIC_ACTIVITY ? (
        <TopicAndActivityImpactReport schoolId={schoolId} termId={termId} isAdminView />
    ) : (
        <ReadingImpactReport schoolId={schoolId} termId={termId} isAdminView />
    );
};

export default ImpactReportV1Preview;
