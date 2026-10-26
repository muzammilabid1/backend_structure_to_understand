import { SchoolImpactReportType } from 'lwp-shared';

import SchoolAnalysisMetric from '../../../../../components/School/SchoolAnalytics/SchoolAnalysisMetric';
import { PageType } from '../../../../../types/enums/PageType';

const TopicAndActivityAnalysisMetric = () => {
    return <SchoolAnalysisMetric reportType={SchoolImpactReportType.TOPIC_ACTIVITY} />;
};

TopicAndActivityAnalysisMetric.pageType = PageType.SCHOOL_LEADER;
TopicAndActivityAnalysisMetric.pageTitle = 'School: Topic activity analytics';

export default TopicAndActivityAnalysisMetric;
