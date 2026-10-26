import HelpAndResources from '../../../../components/School/HelpAndResources';
import { PageType } from '../../../../types/enums/PageType';

const HelpAndResourcesPage = () => <HelpAndResources />;

HelpAndResourcesPage.pageType = PageType.TEACHER;
HelpAndResourcesPage.pageTitle = 'School: Resources';

export default HelpAndResourcesPage;
