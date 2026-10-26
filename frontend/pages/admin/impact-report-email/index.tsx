import ImpactReportEmailTemplate from '../../../components/Admin/ImpactReportEmailTemplate';
import { PageType } from '../../../types/enums/PageType';

const ImpactReportEmailTemplatePage = () => <ImpactReportEmailTemplate />;

ImpactReportEmailTemplatePage.pageType = PageType.ADMIN;
ImpactReportEmailTemplatePage.pageTitle = 'Admin: Impact report email';

export default ImpactReportEmailTemplatePage;
