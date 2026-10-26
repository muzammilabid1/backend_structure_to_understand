import SchoolSettings from '../../../../components/School/SchoolSettings';
import { PageType } from '../../../../types/enums/PageType';

const SchoolSettingsPage = () => <SchoolSettings />;

SchoolSettingsPage.pageType = PageType.SCHOOL_LEADER;
SchoolSettingsPage.pageTitle = 'School settings: Overview';

export default SchoolSettingsPage;
