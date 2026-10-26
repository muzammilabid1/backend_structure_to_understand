import PublicImpactReport from '../../../components/PublicImpactReport';
import { PageType } from '../../../types/enums/PageType';

const PublicImpactReportPage = () => <PublicImpactReport />;

PublicImpactReportPage.pageType = PageType.GENERAL;
PublicImpactReportPage.pageTitle = 'Impact report';

export default PublicImpactReportPage;
