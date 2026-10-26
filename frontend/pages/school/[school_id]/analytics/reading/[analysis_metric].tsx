import { SchoolImpactReportType } from 'lwp-shared';

import SchoolAnalysisMetric from '../../../../../components/School/SchoolAnalytics/SchoolAnalysisMetric';
import { PageType } from '../../../../../types/enums/PageType';

const ReadingAnalysisMetric = () => {
    return <SchoolAnalysisMetric reportType={SchoolImpactReportType.READING} />;
};

ReadingAnalysisMetric.pageType = PageType.SCHOOL_LEADER;
ReadingAnalysisMetric.pageTitle = 'School: Reading analytics';

export default ReadingAnalysisMetric;
