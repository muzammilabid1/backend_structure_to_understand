import AnalyticsAndReport from '../../../../components/School/AnalyticsAndReport';
import { PageType } from '../../../../types/enums/PageType';

const AnalyticsAndReportPage = () => <AnalyticsAndReport />;

AnalyticsAndReportPage.pageType = PageType.SCHOOL_LEADER;
AnalyticsAndReportPage.pageTitle = 'School: Reports';

export default AnalyticsAndReportPage;
